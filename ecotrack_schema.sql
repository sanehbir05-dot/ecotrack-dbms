-- ============================================================
--  ECO-TRACK: Carbon-Aware Supply Chain Management System
--  Database Schema  (PostgreSQL)
--  Course: Database Management Systems (DBMS)
-- ============================================================

-- Drop existing tables (safe re-run)
DROP TABLE IF EXISTS emission_reports     CASCADE;
DROP TABLE IF EXISTS shipment_items       CASCADE;
DROP TABLE IF EXISTS shipments            CASCADE;
DROP TABLE IF EXISTS bill_of_materials    CASCADE;
DROP TABLE IF EXISTS product_materials    CASCADE;
DROP TABLE IF EXISTS products             CASCADE;
DROP TABLE IF EXISTS materials            CASCADE;
DROP TABLE IF EXISTS emission_factors     CASCADE;
DROP TABLE IF EXISTS transport_modes      CASCADE;
DROP TABLE IF EXISTS suppliers            CASCADE;

-- ============================================================
--  1. SUPPLIERS
--  Stores vendor/supplier details + their eco-score
-- ============================================================
CREATE TABLE suppliers (
    supplier_id       SERIAL PRIMARY KEY,
    name              VARCHAR(150)   NOT NULL,
    country           VARCHAR(100)   NOT NULL,
    contact_email     VARCHAR(150),
    contact_phone     VARCHAR(30),
    eco_score         NUMERIC(4,2)   DEFAULT 0.00,  -- derived / updated by trigger
    certified_green   BOOLEAN        DEFAULT FALSE,
    created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  2. TRANSPORT MODES
--  Emission rate per tonne-km for each mode
-- ============================================================
CREATE TABLE transport_modes (
    mode_id           SERIAL PRIMARY KEY,
    mode_name         VARCHAR(80)    NOT NULL UNIQUE,  -- e.g. 'Road', 'Air', 'Sea', 'Rail'
    description       TEXT
);

-- ============================================================
--  3. EMISSION FACTORS
--  kg CO2e per unit (per kg of material OR per tonne-km transport)
-- ============================================================
CREATE TABLE emission_factors (
    factor_id         SERIAL PRIMARY KEY,
    entity_type       VARCHAR(20)    NOT NULL CHECK (entity_type IN ('material', 'transport')),
    entity_name       VARCHAR(150)   NOT NULL,
    co2_per_unit      NUMERIC(10,4)  NOT NULL,  -- kg CO2e per kg (material) or per tonne-km (transport)
    unit_description  VARCHAR(100),
    source            VARCHAR(200),              -- e.g. 'IPCC 2023', 'GHG Protocol'
    valid_from        DATE           DEFAULT CURRENT_DATE
);

-- ============================================================
--  4. MATERIALS
--  Raw materials used in manufacturing
-- ============================================================
CREATE TABLE materials (
    material_id       SERIAL PRIMARY KEY,
    name              VARCHAR(150)   NOT NULL,
    category          VARCHAR(80),               -- e.g. 'Metal', 'Plastic', 'Textile'
    factor_id         INT            REFERENCES emission_factors(factor_id) ON DELETE SET NULL,
    unit              VARCHAR(20)    DEFAULT 'kg',
    description       TEXT
);

-- ============================================================
--  5. PRODUCTS
--  Finished / semi-finished products
--  parent_product_id enables recursive (BOM) relationships
-- ============================================================
CREATE TABLE products (
    product_id        SERIAL PRIMARY KEY,
    name              VARCHAR(150)   NOT NULL,
    sku               VARCHAR(80)    UNIQUE,
    category          VARCHAR(80),
    supplier_id       INT            REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    parent_product_id INT            REFERENCES products(product_id) ON DELETE SET NULL,  -- RECURSIVE
    unit_weight_kg    NUMERIC(10,3)  DEFAULT 1.000,
    carbon_footprint  NUMERIC(12,4)  DEFAULT 0.0000,  -- kg CO2e — updated by trigger
    created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  6. PRODUCT_MATERIALS  (M:N junction — Product ↔ Material)
--  Tracks how much of each material a product contains
-- ============================================================
CREATE TABLE product_materials (
    product_id        INT  NOT NULL REFERENCES products(product_id)   ON DELETE CASCADE,
    material_id       INT  NOT NULL REFERENCES materials(material_id) ON DELETE CASCADE,
    quantity_kg       NUMERIC(10,3) NOT NULL,
    PRIMARY KEY (product_id, material_id)
);

-- ============================================================
--  7. BILL OF MATERIALS  (Recursive — Product ↔ Sub-Product)
--  Handles complex multi-level product structures
-- ============================================================
CREATE TABLE bill_of_materials (
    bom_id            SERIAL PRIMARY KEY,
    parent_product_id INT  NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    child_product_id  INT  NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity          NUMERIC(10,3) NOT NULL DEFAULT 1.000,
    level             INT           NOT NULL DEFAULT 1,  -- depth in BOM hierarchy
    CONSTRAINT no_self_reference CHECK (parent_product_id <> child_product_id),
    UNIQUE (parent_product_id, child_product_id)
);

-- ============================================================
--  8. SHIPMENTS
--  Each shipment moves products from a supplier to a destination
-- ============================================================
CREATE TABLE shipments (
    shipment_id       SERIAL PRIMARY KEY,
    supplier_id       INT            NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    mode_id           INT            NOT NULL REFERENCES transport_modes(mode_id) ON DELETE RESTRICT,
    origin_location   VARCHAR(150)   NOT NULL,
    destination       VARCHAR(150)   NOT NULL,
    distance_km       NUMERIC(10,2)  NOT NULL,
    shipment_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
    status            VARCHAR(30)    DEFAULT 'pending' CHECK (status IN ('pending','in_transit','delivered','cancelled')),
    total_weight_kg   NUMERIC(12,3)  DEFAULT 0.000,   -- auto-summed from shipment_items
    total_emissions   NUMERIC(14,4)  DEFAULT 0.0000,  -- kg CO2e — auto-calculated by trigger
    notes             TEXT,
    created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  9. SHIPMENT_ITEMS  (M:N junction — Shipment ↔ Product)
--  Line items within each shipment
-- ============================================================
CREATE TABLE shipment_items (
    item_id           SERIAL PRIMARY KEY,
    shipment_id       INT  NOT NULL REFERENCES shipments(shipment_id)  ON DELETE CASCADE,
    product_id        INT  NOT NULL REFERENCES products(product_id)    ON DELETE RESTRICT,
    quantity          INT  NOT NULL CHECK (quantity > 0),
    weight_kg         NUMERIC(10,3) NOT NULL,
    item_emissions    NUMERIC(12,4) DEFAULT 0.0000  -- kg CO2e for this line
);

-- ============================================================
--  10. EMISSION_REPORTS  (Monthly aggregated reports)
-- ============================================================
CREATE TABLE emission_reports (
    report_id         SERIAL PRIMARY KEY,
    report_month      DATE           NOT NULL,   -- store as first day of month, e.g. 2024-03-01
    supplier_id       INT            REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    category          VARCHAR(80),               -- product category
    total_emissions   NUMERIC(14,4)  NOT NULL,   -- kg CO2e
    shipment_count    INT            DEFAULT 0,
    generated_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (report_month, supplier_id, category)
);

-- ============================================================
--  INDEXES  (for common query patterns)
-- ============================================================
CREATE INDEX idx_products_supplier       ON products(supplier_id);
CREATE INDEX idx_products_parent         ON products(parent_product_id);
CREATE INDEX idx_shipments_supplier      ON shipments(supplier_id);
CREATE INDEX idx_shipments_date          ON shipments(shipment_date);
CREATE INDEX idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX idx_bom_parent              ON bill_of_materials(parent_product_id);
CREATE INDEX idx_bom_child               ON bill_of_materials(child_product_id);
CREATE INDEX idx_reports_month           ON emission_reports(report_month);

-- ============================================================
--  TRIGGER 1: Auto-calculate shipment emissions on INSERT/UPDATE
--  Formula: distance_km × (weight_kg / 1000) × co2_per_unit
-- ============================================================
CREATE OR REPLACE FUNCTION calc_shipment_emissions()
RETURNS TRIGGER AS $$
DECLARE
    ef_value NUMERIC;
BEGIN
    SELECT ef.co2_per_unit INTO ef_value
    FROM   emission_factors ef
    JOIN   transport_modes  tm ON tm.mode_name = ef.entity_name
    WHERE  tm.mode_id = NEW.mode_id
      AND  ef.entity_type = 'transport'
    LIMIT 1;

    IF ef_value IS NOT NULL THEN
        NEW.total_emissions := NEW.distance_km * (NEW.total_weight_kg / 1000.0) * ef_value;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipment_emissions
BEFORE INSERT OR UPDATE ON shipments
FOR EACH ROW EXECUTE FUNCTION calc_shipment_emissions();

-- ============================================================
--  TRIGGER 2: Update shipment total_weight_kg when items change
-- ============================================================
CREATE OR REPLACE FUNCTION update_shipment_weight()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE shipments
    SET    total_weight_kg = (
               SELECT COALESCE(SUM(weight_kg), 0)
               FROM   shipment_items
               WHERE  shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
           )
    WHERE  shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_weight
AFTER INSERT OR UPDATE OR DELETE ON shipment_items
FOR EACH ROW EXECUTE FUNCTION update_shipment_weight();

-- ============================================================
--  TRIGGER 3: Update supplier eco_score after each shipment
--  Score = inverse of avg emissions per kg (lower = greener)
-- ============================================================
CREATE OR REPLACE FUNCTION update_supplier_eco_score()
RETURNS TRIGGER AS $$
DECLARE
    avg_emit NUMERIC;
BEGIN
    SELECT CASE WHEN SUM(total_weight_kg) = 0 THEN 0
                ELSE ROUND(100 - LEAST(100, SUM(total_emissions) / NULLIF(SUM(total_weight_kg), 0) * 10), 2)
           END INTO avg_emit
    FROM   shipments
    WHERE  supplier_id = NEW.supplier_id
      AND  status = 'delivered';

    UPDATE suppliers
    SET    eco_score = COALESCE(avg_emit, 50)
    WHERE  supplier_id = NEW.supplier_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_eco_score
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN (NEW.status = 'delivered')
EXECUTE FUNCTION update_supplier_eco_score();

-- ============================================================
--  STORED PROCEDURE: Generate monthly emission report
-- ============================================================
CREATE OR REPLACE PROCEDURE generate_monthly_report(p_month DATE)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO emission_reports (report_month, supplier_id, category, total_emissions, shipment_count)
    SELECT
        DATE_TRUNC('month', s.shipment_date)::DATE AS report_month,
        s.supplier_id,
        p.category,
        SUM(si.item_emissions)                     AS total_emissions,
        COUNT(DISTINCT s.shipment_id)              AS shipment_count
    FROM   shipments      s
    JOIN   shipment_items si ON si.shipment_id = s.shipment_id
    JOIN   products       p  ON p.product_id   = si.product_id
    WHERE  DATE_TRUNC('month', s.shipment_date) = DATE_TRUNC('month', p_month)
    GROUP  BY 1, 2, 3
    ON CONFLICT (report_month, supplier_id, category)
    DO UPDATE SET
        total_emissions = EXCLUDED.total_emissions,
        shipment_count  = EXCLUDED.shipment_count,
        generated_at    = CURRENT_TIMESTAMP;
END;
$$;

-- ============================================================
--  VIEW: Supplier performance dashboard
-- ============================================================
CREATE OR REPLACE VIEW v_supplier_performance AS
SELECT
    s.supplier_id,
    s.name                                              AS supplier_name,
    s.country,
    s.eco_score,
    s.certified_green,
    COUNT(sh.shipment_id)                               AS total_shipments,
    COALESCE(SUM(sh.total_emissions), 0)                AS lifetime_emissions_kg,
    COALESCE(SUM(sh.total_weight_kg), 0)                AS lifetime_weight_kg,
    COALESCE(
        ROUND(SUM(sh.total_emissions) / NULLIF(SUM(sh.total_weight_kg), 0), 4),
        0
    )                                                   AS kg_co2_per_kg_shipped
FROM   suppliers s
LEFT   JOIN shipments sh ON sh.supplier_id = s.supplier_id
GROUP  BY s.supplier_id, s.name, s.country, s.eco_score, s.certified_green;

-- ============================================================
--  VIEW: Product carbon footprint with BOM rollup
-- ============================================================
CREATE OR REPLACE VIEW v_product_carbon AS
SELECT
    p.product_id,
    p.name          AS product_name,
    p.sku,
    p.category,
    p.carbon_footprint,
    sup.name        AS supplier_name,
    pp.name         AS parent_product_name
FROM   products  p
LEFT   JOIN suppliers sup ON sup.supplier_id = p.supplier_id
LEFT   JOIN products  pp  ON pp.product_id   = p.parent_product_id;

-- ============================================================
--  RECURSIVE QUERY EXAMPLE: Full BOM explosion
--  Run this to get the entire component tree of a product
--  Replace $1 with any top-level product_id
-- ============================================================
-- WITH RECURSIVE bom_tree AS (
--     SELECT
--         b.parent_product_id,
--         b.child_product_id,
--         p.name  AS child_name,
--         b.quantity,
--         1       AS depth
--     FROM   bill_of_materials b
--     JOIN   products p ON p.product_id = b.child_product_id
--     WHERE  b.parent_product_id = $1
--
--     UNION ALL
--
--     SELECT
--         b.parent_product_id,
--         b.child_product_id,
--         p.name,
--         b.quantity,
--         bt.depth + 1
--     FROM   bill_of_materials b
--     JOIN   products          p  ON p.product_id = b.child_product_id
--     JOIN   bom_tree          bt ON bt.child_product_id = b.parent_product_id
-- )
-- SELECT * FROM bom_tree ORDER BY depth, child_name;
CREATE OR REPLACE PROCEDURE CalculateProductFootprint(p_id INT)
LANGUAGE plpgsql AS $$
DECLARE
    v_footprint NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(pm.quantity_kg * ef.co2_per_unit), 0)
    INTO   v_footprint
    FROM   product_materials pm
    JOIN   materials         m  ON m.material_id  = pm.material_id
    JOIN   emission_factors  ef ON ef.factor_id   = m.factor_id
    WHERE  pm.product_id = p_id;

    UPDATE products
    SET    carbon_footprint = v_footprint
    WHERE  product_id = p_id;
END;
$$;
CREATE OR REPLACE FUNCTION recalc_on_emission_change()
RETURNS TRIGGER AS $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT pm.product_id
        FROM   product_materials pm
        JOIN   materials m ON m.material_id = pm.material_id
        WHERE  m.factor_id = NEW.factor_id
    LOOP
        CALL CalculateProductFootprint(r.product_id);
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER After_Material_Update
AFTER UPDATE OF co2_per_unit ON emission_factors
FOR EACH ROW EXECUTE FUNCTION recalc_on_emission_change();
CREATE OR REPLACE VIEW V_HighEmissionProducts AS
SELECT * FROM products
WHERE carbon_footprint > 500;