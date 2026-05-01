"""
ECO-TRACK  —  Flask REST API
Run:  pip install flask psycopg2-binary flask-cors
      python ecotrack_api.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import os

app = Flask(__name__)
CORS(app)   # allow React dev server (localhost:5173) to call this

# ── DB connection ──────────────────────────────────────────────────────────────
DB = {
    "dbname":   os.getenv("DB_NAME",   "ecotrack"),
    "user":     os.getenv("DB_USER",   "postgres"),
    "password": os.getenv("DB_PASS",   ""),
    "host":     os.getenv("DB_HOST",   "localhost"),
    "port":     os.getenv("DB_PORT",   "5432"),
}

def get_conn():
    return psycopg2.connect(**DB)

def query(sql, params=None, one=False):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        conn.commit()
        if one:
            return cur.fetchone()
        return cur.fetchall()
    finally:
        conn.close()

def execute(sql, params=None):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
    finally:
        conn.close()


# ── SUPPLIERS ──────────────────────────────────────────────────────────────────

@app.route("/api/suppliers", methods=["GET"])
def get_suppliers():
    rows = query("""
        SELECT supplier_id, supplier_name, country,
               eco_score, certified_green,
               total_shipments, lifetime_emissions_kg, kg_co2_per_kg_shipped
        FROM   v_supplier_performance
        ORDER  BY eco_score DESC
    """)
    return jsonify(list(rows))

@app.route("/api/suppliers/<int:sid>", methods=["GET"])
def get_supplier(sid):
    row = query("SELECT * FROM v_supplier_performance WHERE supplier_id=%s", (sid,), one=True)
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))

@app.route("/api/suppliers", methods=["POST"])
def create_supplier():
    d = request.json
    row = query("""
        INSERT INTO suppliers (name, country, contact_email, contact_phone, certified_green)
        VALUES (%s,%s,%s,%s,%s) RETURNING *
    """, (d["name"], d["country"], d.get("contact_email"),
          d.get("contact_phone"), d.get("certified_green", False)), one=True)
    return jsonify(dict(row)), 201


# ── PRODUCTS ───────────────────────────────────────────────────────────────────

@app.route("/api/products", methods=["GET"])
def get_products():
    rows = query("""
        SELECT product_id, name, sku, category,
               supplier_name, carbon_footprint, parent_product_name
        FROM   v_product_carbon
        ORDER  BY category, name
    """)
    return jsonify(list(rows))

@app.route("/api/products/<int:pid>", methods=["GET"])
def get_product(pid):
    row = query("SELECT * FROM v_product_carbon WHERE product_id=%s", (pid,), one=True)
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))

@app.route("/api/products/<int:pid>/bom", methods=["GET"])
def get_bom(pid):
    """Full recursive BOM explosion for a product."""
    rows = query("""
        WITH RECURSIVE bom_tree AS (
            SELECT b.parent_product_id,
                   b.child_product_id,
                   p.name   AS child_name,
                   p.sku    AS child_sku,
                   p.carbon_footprint,
                   b.quantity,
                   1        AS depth
            FROM   bill_of_materials b
            JOIN   products p ON p.product_id = b.child_product_id
            WHERE  b.parent_product_id = %s

            UNION ALL

            SELECT b.parent_product_id,
                   b.child_product_id,
                   p.name,
                   p.sku,
                   p.carbon_footprint,
                   b.quantity,
                   bt.depth + 1
            FROM   bill_of_materials b
            JOIN   products  p  ON p.product_id  = b.child_product_id
            JOIN   bom_tree  bt ON bt.child_product_id = b.parent_product_id
        )
        SELECT * FROM bom_tree ORDER BY depth, child_name
    """, (pid,))
    return jsonify(list(rows))


# ── SHIPMENTS ──────────────────────────────────────────────────────────────────

@app.route("/api/shipments", methods=["GET"])
def get_shipments():
    rows = query("""
        SELECT s.shipment_id, sup.name AS supplier_name, tm.mode_name,
               s.origin_location, s.destination, s.distance_km,
               s.shipment_date, s.status,
               s.total_weight_kg, s.total_emissions
        FROM   shipments      s
        JOIN   suppliers      sup ON sup.supplier_id = s.supplier_id
        JOIN   transport_modes tm  ON tm.mode_id     = s.mode_id
        ORDER  BY s.shipment_date DESC
    """)
    return jsonify(list(rows))

@app.route("/api/shipments", methods=["POST"])
def create_shipment():
    d = request.json
    row = query("""
        INSERT INTO shipments
            (supplier_id, mode_id, origin_location, destination,
             distance_km, shipment_date, status, notes)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
    """, (d["supplier_id"], d["mode_id"], d["origin_location"],
          d["destination"], d["distance_km"],
          d.get("shipment_date", "today"),
          d.get("status", "pending"), d.get("notes")), one=True)
    return jsonify(dict(row)), 201

@app.route("/api/shipments/<int:sid>/status", methods=["PATCH"])
def update_shipment_status(sid):
    status = request.json.get("status")
    valid  = ("pending", "in_transit", "delivered", "cancelled")
    if status not in valid:
        return jsonify({"error": f"status must be one of {valid}"}), 400
    execute("UPDATE shipments SET status=%s WHERE shipment_id=%s", (status, sid))
    return jsonify({"shipment_id": sid, "status": status})


# ── EMISSION REPORTS ───────────────────────────────────────────────────────────

@app.route("/api/reports/monthly", methods=["GET"])
def monthly_reports():
    rows = query("""
        SELECT er.report_month,
               sup.name    AS supplier_name,
               er.category,
               er.total_emissions,
               er.shipment_count
        FROM   emission_reports er
        LEFT   JOIN suppliers sup ON sup.supplier_id = er.supplier_id
        ORDER  BY er.report_month DESC, er.total_emissions DESC
    """)
    return jsonify(list(rows))

@app.route("/api/reports/monthly/<string:month>", methods=["POST"])
def generate_report(month):
    """Generate / refresh report for a given month (YYYY-MM-DD)."""
    execute("CALL generate_monthly_report(%s::DATE)", (month,))
    return jsonify({"message": f"Report generated for {month}"}), 201

@app.route("/api/reports/summary", methods=["GET"])
def summary():
    """High-level KPIs for the dashboard header cards."""
    row = query("""
        SELECT
            (SELECT COUNT(*) FROM suppliers)                        AS total_suppliers,
            (SELECT COUNT(*) FROM shipments WHERE status='delivered') AS delivered_shipments,
            (SELECT COALESCE(SUM(total_emissions),0) FROM shipments
             WHERE  status='delivered')                             AS total_emissions_kg,
            (SELECT COALESCE(AVG(eco_score),0) FROM suppliers)     AS avg_eco_score,
            (SELECT COUNT(*) FROM products)                         AS total_products
    """, one=True)
    return jsonify(dict(row))

@app.route("/api/reports/by-mode", methods=["GET"])
def emissions_by_mode():
    rows = query("""
        SELECT tm.mode_name,
               COUNT(s.shipment_id)        AS shipment_count,
               ROUND(SUM(s.total_emissions)::NUMERIC, 2) AS total_emissions
        FROM   shipments       s
        JOIN   transport_modes tm ON tm.mode_id = s.mode_id
        WHERE  s.status = 'delivered'
        GROUP  BY tm.mode_name
        ORDER  BY total_emissions DESC
    """)
    return jsonify(list(rows))

@app.route("/api/reports/monthly-trend", methods=["GET"])
def monthly_trend():
    rows = query("""
        SELECT DATE_TRUNC('month', shipment_date)::DATE AS month,
               ROUND(SUM(total_emissions)::NUMERIC, 2)  AS emissions
        FROM   shipments
        WHERE  status = 'delivered'
        GROUP  BY 1
        ORDER  BY 1
    """)
    return jsonify(list(rows))


# ── TRANSPORT MODES ────────────────────────────────────────────────────────────

@app.route("/api/transport-modes", methods=["GET"])
def transport_modes():
    rows = query("SELECT * FROM transport_modes ORDER BY mode_name")
    return jsonify(list(rows))


# ── EMISSION FACTORS ───────────────────────────────────────────────────────────

@app.route("/api/emission-factors", methods=["GET"])
def emission_factors():
    rows = query("SELECT * FROM emission_factors ORDER BY entity_type, entity_name")
    return jsonify(list(rows))


# ── HEALTH CHECK ───────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "project": "Eco-Track"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
