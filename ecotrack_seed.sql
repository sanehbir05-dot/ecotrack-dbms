-- ============================================================
--  ECO-TRACK: Seed Data
--  Run AFTER ecotrack_schema.sql
-- ============================================================

-- ============================================================
--  1. TRANSPORT MODES
-- ============================================================
INSERT INTO transport_modes (mode_name, description) VALUES
    ('Road',  'Truck/lorry transport via road network'),
    ('Air',   'Air freight — fastest, highest emissions'),
    ('Sea',   'Ocean freight — slowest, lowest emissions per tonne-km'),
    ('Rail',  'Rail freight — low emission, land-based');

-- ============================================================
--  2. EMISSION FACTORS
--  Sources: GHG Protocol / IPCC 2023 estimates
-- ============================================================
INSERT INTO emission_factors (entity_type, entity_name, co2_per_unit, unit_description, source) VALUES
    -- Transport (kg CO2e per tonne-km)
    ('transport', 'Road',   0.0960, 'kg CO2e per tonne-km', 'GHG Protocol 2023'),
    ('transport', 'Air',    0.6020, 'kg CO2e per tonne-km', 'IPCC AR6 2023'),
    ('transport', 'Sea',    0.0082, 'kg CO2e per tonne-km', 'IMO 2023'),
    ('transport', 'Rail',   0.0280, 'kg CO2e per tonne-km', 'GHG Protocol 2023'),
    -- Materials (kg CO2e per kg of material)
    ('material', 'Steel',          1.8500, 'kg CO2e per kg', 'World Steel Association 2023'),
    ('material', 'Aluminium',      8.2400, 'kg CO2e per kg', 'International Aluminium Institute'),
    ('material', 'Plastic (PET)',  2.7300, 'kg CO2e per kg', 'PlasticsEurope 2023'),
    ('material', 'Cotton',         5.8900, 'kg CO2e per kg', 'Textile Exchange 2023'),
    ('material', 'Glass',          0.8500, 'kg CO2e per kg', 'Glass Alliance Europe'),
    ('material', 'Copper',         2.3800, 'kg CO2e per kg', 'ICSG 2023'),
    ('material', 'Lithium',       15.1200, 'kg CO2e per kg', 'Nature Energy 2023'),
    ('material', 'Silicon',        5.0600, 'kg CO2e per kg', 'SolarPower Europe 2023');

-- ============================================================
--  3. SUPPLIERS
-- ============================================================
INSERT INTO suppliers (name, country, contact_email, certified_green) VALUES
    ('GreenTech Components',   'Germany',     'info@greentech.de',       TRUE),
    ('AsiaParts Ltd',          'China',       'sales@asiaparts.cn',      FALSE),
    ('EcoMaterials India',     'India',       'contact@ecomaterials.in', TRUE),
    ('FastShip Global',        'UAE',         'ops@fastship.ae',         FALSE),
    ('Nordic Sustainable Co',  'Sweden',      'hello@nordicsust.se',     TRUE),
    ('SouthAm Raw Resources',  'Brazil',      'export@southamrr.br',     FALSE),
    ('Pacific Logistics Inc',  'Japan',       'logistics@pacific.jp',    TRUE),
    ('Atlas Manufacturing',    'USA',         'biz@atlasmanuf.com',      FALSE);

-- ============================================================
--  4. MATERIALS
-- ============================================================
INSERT INTO materials (name, category, factor_id, unit) VALUES
    ('Steel Sheets',        'Metal',    (SELECT factor_id FROM emission_factors WHERE entity_name = 'Steel'),            'kg'),
    ('Aluminium Rods',      'Metal',    (SELECT factor_id FROM emission_factors WHERE entity_name = 'Aluminium'),        'kg'),
    ('PET Plastic Pellets', 'Plastic',  (SELECT factor_id FROM emission_factors WHERE entity_name = 'Plastic (PET)'),   'kg'),
    ('Raw Cotton',          'Textile',  (SELECT factor_id FROM emission_factors WHERE entity_name = 'Cotton'),           'kg'),
    ('Borosilicate Glass',  'Glass',    (SELECT factor_id FROM emission_factors WHERE entity_name = 'Glass'),            'kg'),
    ('Copper Wire',         'Metal',    (SELECT factor_id FROM emission_factors WHERE entity_name = 'Copper'),           'kg'),
    ('Lithium Carbonate',   'Chemical', (SELECT factor_id FROM emission_factors WHERE entity_name = 'Lithium'),          'kg'),
    ('Silicon Wafers',      'Chemical', (SELECT factor_id FROM emission_factors WHERE entity_name = 'Silicon'),          'kg');

-- ============================================================
--  5. PRODUCTS  (mix of standalone + parent/child for BOM)
-- ============================================================
-- Top-level products first (no parent)
INSERT INTO products (name, sku, category, supplier_id, unit_weight_kg) VALUES
    ('Electric Vehicle Battery Pack',  'EVB-001', 'Energy',      1, 250.000),
    ('Solar Panel Module',             'SPM-001', 'Energy',      5,  20.500),
    ('Industrial Robot Arm',           'IRA-001', 'Machinery',   3, 180.000),
    ('Smart Thermostat',               'STH-001', 'Electronics', 7,   0.850),
    ('Reusable Water Bottle',          'RWB-001', 'Consumer',    3,   0.350),
    ('Cotton T-Shirt',                 'CTS-001', 'Apparel',     6,   0.200),
    ('Laptop Computer',                'LPC-001', 'Electronics', 2,   1.800),
    ('LED Street Light',               'LSL-001', 'Lighting',    1,   8.500);

-- Sub-components (children linked to parent products)
INSERT INTO products (name, sku, category, supplier_id, parent_product_id, unit_weight_kg) VALUES
    ('Battery Cell Array',   'BCA-001', 'Energy',      2, (SELECT product_id FROM products WHERE sku='EVB-001'), 180.000),
    ('Battery Management PCB','BMP-001','Electronics', 4, (SELECT product_id FROM products WHERE sku='EVB-001'),   2.500),
    ('Solar Cell Assembly',  'SCA-001', 'Energy',      5, (SELECT product_id FROM products WHERE sku='SPM-001'),  14.000),
    ('Aluminium Frame',      'ALF-001', 'Metal',       1, (SELECT product_id FROM products WHERE sku='SPM-001'),   5.200),
    ('Robot Joint Motor',    'RJM-001', 'Machinery',   7, (SELECT product_id FROM products WHERE sku='IRA-001'),  12.000),
    ('Carbon Fibre Arm',     'CFA-001', 'Machinery',   5, (SELECT product_id FROM products WHERE sku='IRA-001'),  40.000),
    ('Laptop Motherboard',   'LMB-001', 'Electronics', 2, (SELECT product_id FROM products WHERE sku='LPC-001'),   0.450),
    ('Laptop Battery',       'LBT-001', 'Electronics', 2, (SELECT product_id FROM products WHERE sku='LPC-001'),   0.320);

-- ============================================================
--  6. PRODUCT_MATERIALS  (what each product is made of)
-- ============================================================
INSERT INTO product_materials (product_id, material_id, quantity_kg) VALUES
    -- EV Battery Pack → Lithium + Aluminium + Copper
    ((SELECT product_id FROM products WHERE sku='EVB-001'),
     (SELECT material_id FROM materials WHERE name='Lithium Carbonate'),   45.0),
    ((SELECT product_id FROM products WHERE sku='EVB-001'),
     (SELECT material_id FROM materials WHERE name='Aluminium Rods'),      60.0),
    ((SELECT product_id FROM products WHERE sku='EVB-001'),
     (SELECT material_id FROM materials WHERE name='Copper Wire'),         12.0),
    -- Solar Panel → Silicon + Aluminium + Glass
    ((SELECT product_id FROM products WHERE sku='SPM-001'),
     (SELECT material_id FROM materials WHERE name='Silicon Wafers'),       8.0),
    ((SELECT product_id FROM products WHERE sku='SPM-001'),
     (SELECT material_id FROM materials WHERE name='Borosilicate Glass'),   9.0),
    ((SELECT product_id FROM products WHERE sku='SPM-001'),
     (SELECT material_id FROM materials WHERE name='Aluminium Rods'),       3.5),
    -- Laptop → Silicon + Copper + Plastic
    ((SELECT product_id FROM products WHERE sku='LPC-001'),
     (SELECT material_id FROM materials WHERE name='Silicon Wafers'),       0.3),
    ((SELECT product_id FROM products WHERE sku='LPC-001'),
     (SELECT material_id FROM materials WHERE name='Copper Wire'),          0.4),
    ((SELECT product_id FROM products WHERE sku='LPC-001'),
     (SELECT material_id FROM materials WHERE name='PET Plastic Pellets'),  0.5),
    -- Cotton T-Shirt → Cotton
    ((SELECT product_id FROM products WHERE sku='CTS-001'),
     (SELECT material_id FROM materials WHERE name='Raw Cotton'),           0.2),
    -- Water Bottle → Glass + PET
    ((SELECT product_id FROM products WHERE sku='RWB-001'),
     (SELECT material_id FROM materials WHERE name='Borosilicate Glass'),   0.25),
    -- LED Street Light → Steel + Aluminium + Copper
    ((SELECT product_id FROM products WHERE sku='LSL-001'),
     (SELECT material_id FROM materials WHERE name='Steel Sheets'),         3.0),
    ((SELECT product_id FROM products WHERE sku='LSL-001'),
     (SELECT material_id FROM materials WHERE name='Aluminium Rods'),       2.5),
    ((SELECT product_id FROM products WHERE sku='LSL-001'),
     (SELECT material_id FROM materials WHERE name='Copper Wire'),          0.8);

-- ============================================================
--  7. BILL OF MATERIALS
-- ============================================================
INSERT INTO bill_of_materials (parent_product_id, child_product_id, quantity, level) VALUES
    -- EV Battery Pack contains: Battery Cell Array + BMS PCB
    ((SELECT product_id FROM products WHERE sku='EVB-001'),
     (SELECT product_id FROM products WHERE sku='BCA-001'), 1, 1),
    ((SELECT product_id FROM products WHERE sku='EVB-001'),
     (SELECT product_id FROM products WHERE sku='BMP-001'), 2, 1),
    -- Solar Panel contains: Solar Cell Assembly + Aluminium Frame
    ((SELECT product_id FROM products WHERE sku='SPM-001'),
     (SELECT product_id FROM products WHERE sku='SCA-001'), 1, 1),
    ((SELECT product_id FROM products WHERE sku='SPM-001'),
     (SELECT product_id FROM products WHERE sku='ALF-001'), 1, 1),
    -- Industrial Robot Arm contains: Joint Motor (x6) + Carbon Fibre Arm
    ((SELECT product_id FROM products WHERE sku='IRA-001'),
     (SELECT product_id FROM products WHERE sku='RJM-001'), 6, 1),
    ((SELECT product_id FROM products WHERE sku='IRA-001'),
     (SELECT product_id FROM products WHERE sku='CFA-001'), 1, 1),
    -- Laptop contains: Motherboard + Battery
    ((SELECT product_id FROM products WHERE sku='LPC-001'),
     (SELECT product_id FROM products WHERE sku='LMB-001'), 1, 1),
    ((SELECT product_id FROM products WHERE sku='LPC-001'),
     (SELECT product_id FROM products WHERE sku='LBT-001'), 1, 1);

-- ============================================================
--  8. SHIPMENTS  (mix of delivered + in_transit + pending)
-- ============================================================
INSERT INTO shipments (supplier_id, mode_id, origin_location, destination, distance_km, shipment_date, status) VALUES
    (1, 1, 'Munich, Germany',    'Paris, France',        831,  '2024-01-08',  'delivered'),
    (2, 3, 'Shanghai, China',    'Hamburg, Germany',    18400, '2024-01-15',  'delivered'),
    (3, 1, 'Mumbai, India',      'Dubai, UAE',          1924,  '2024-02-03',  'delivered'),
    (5, 4, 'Stockholm, Sweden',  'Berlin, Germany',     1530,  '2024-02-18',  'delivered'),
    (1, 1, 'Munich, Germany',    'Amsterdam, Netherlands', 850,'2024-03-05',  'delivered'),
    (4, 2, 'Dubai, UAE',         'London, UK',          5500,  '2024-03-12',  'delivered'),
    (7, 3, 'Tokyo, Japan',       'Los Angeles, USA',    8800,  '2024-03-22',  'delivered'),
    (2, 2, 'Beijing, China',     'New York, USA',      11000,  '2024-04-01',  'delivered'),
    (6, 3, 'São Paulo, Brazil',  'Rotterdam, Netherlands',9200,'2024-04-14',  'delivered'),
    (8, 1, 'Chicago, USA',       'Toronto, Canada',      700,  '2024-05-02',  'delivered'),
    (3, 4, 'Delhi, India',       'Lahore, Pakistan',     500,  '2024-05-20',  'delivered'),
    (5, 1, 'Gothenburg, Sweden', 'Oslo, Norway',         290,  '2024-06-08',  'delivered'),
    (1, 1, 'Frankfurt, Germany', 'Warsaw, Poland',      1150,  '2024-06-25',  'delivered'),
    (2, 3, 'Guangzhou, China',   'Sydney, Australia',   8900,  '2024-07-10',  'delivered'),
    (7, 4, 'Osaka, Japan',       'Seoul, South Korea',   600,  '2024-07-28',  'delivered'),
    (4, 2, 'Abu Dhabi, UAE',     'Mumbai, India',       2200,  '2024-08-05',  'delivered'),
    (6, 3, 'Rio de Janeiro',     'Cape Town, South Africa',6100,'2024-08-19', 'delivered'),
    (8, 1, 'Detroit, USA',       'Mexico City, Mexico', 3200,  '2024-09-03',  'delivered'),
    (3, 1, 'Chennai, India',     'Colombo, Sri Lanka',   310,  '2024-09-17',  'delivered'),
    (5, 4, 'Malmö, Sweden',      'Copenhagen, Denmark',  280,  '2024-10-01',  'delivered'),
    (1, 1, 'Hamburg, Germany',   'Vienna, Austria',     1250,  '2024-10-15',  'delivered'),
    (2, 3, 'Tianjin, China',     'Dubai, UAE',          7200,  '2024-11-02',  'delivered'),
    (7, 3, 'Yokohama, Japan',    'Vancouver, Canada',   7500,  '2024-11-20',  'delivered'),
    (4, 2, 'Dubai, UAE',         'Nairobi, Kenya',      3700,  '2024-12-04',  'delivered'),
    (6, 3, 'Manaus, Brazil',     'Lisbon, Portugal',    8100,  '2024-12-18',  'delivered'),
    -- Recent / in-transit
    (1, 1, 'Munich, Germany',    'Brussels, Belgium',    780,  '2025-01-10',  'in_transit'),
    (2, 3, 'Shanghai, China',    'Rotterdam, Netherlands',19000,'2025-01-22', 'in_transit'),
    (3, 1, 'Pune, India',        'Karachi, Pakistan',    900,  '2025-02-05',  'pending'),
    (5, 4, 'Uppsala, Sweden',    'Helsinki, Finland',    550,  '2025-02-18',  'pending'),
    (7, 2, 'Tokyo, Japan',       'Sydney, Australia',   7800,  '2025-03-01',  'pending');

-- ============================================================
--  9. SHIPMENT ITEMS
-- ============================================================
INSERT INTO shipment_items (shipment_id, product_id, quantity, weight_kg) VALUES
    (1,  (SELECT product_id FROM products WHERE sku='LSL-001'),  50,  425.00),
    (1,  (SELECT product_id FROM products WHERE sku='STH-001'),  100,  85.00),
    (2,  (SELECT product_id FROM products WHERE sku='LPC-001'),  200, 360.00),
    (2,  (SELECT product_id FROM products WHERE sku='STH-001'),  500, 425.00),
    (3,  (SELECT product_id FROM products WHERE sku='CTS-001'),  2000, 400.00),
    (3,  (SELECT product_id FROM products WHERE sku='RWB-001'),  1000, 350.00),
    (4,  (SELECT product_id FROM products WHERE sku='SPM-001'),  30,  615.00),
    (5,  (SELECT product_id FROM products WHERE sku='LSL-001'),  100, 850.00),
    (6,  (SELECT product_id FROM products WHERE sku='LPC-001'),  80,  144.00),
    (7,  (SELECT product_id FROM products WHERE sku='SPM-001'),  20,  410.00),
    (8,  (SELECT product_id FROM products WHERE sku='LPC-001'),  500, 900.00),
    (9,  (SELECT product_id FROM products WHERE sku='RWB-001'),  3000,1050.00),
    (10, (SELECT product_id FROM products WHERE sku='IRA-001'),  5,   900.00),
    (11, (SELECT product_id FROM products WHERE sku='CTS-001'),  5000,1000.00),
    (12, (SELECT product_id FROM products WHERE sku='SPM-001'),  40,  820.00),
    (13, (SELECT product_id FROM products WHERE sku='LSL-001'),  200,1700.00),
    (14, (SELECT product_id FROM products WHERE sku='LPC-001'),  300, 540.00),
    (15, (SELECT product_id FROM products WHERE sku='STH-001'),  800, 680.00),
    (16, (SELECT product_id FROM products WHERE sku='EVB-001'),  10, 2500.00),
    (17, (SELECT product_id FROM products WHERE sku='CTS-001'),  8000,1600.00),
    (18, (SELECT product_id FROM products WHERE sku='IRA-001'),  3,   540.00),
    (19, (SELECT product_id FROM products WHERE sku='RWB-001'),  2000, 700.00),
    (20, (SELECT product_id FROM products WHERE sku='SPM-001'),  60, 1230.00),
    (21, (SELECT product_id FROM products WHERE sku='LSL-001'),  150,1275.00),
    (22, (SELECT product_id FROM products WHERE sku='LPC-001'),  400, 720.00),
    (23, (SELECT product_id FROM products WHERE sku='SPM-001'),  25,  512.50),
    (24, (SELECT product_id FROM products WHERE sku='STH-001'),  1000, 850.00),
    (25, (SELECT product_id FROM products WHERE sku='CTS-001'),  10000,2000.00),
    (26, (SELECT product_id FROM products WHERE sku='LSL-001'),  80,  680.00),
    (27, (SELECT product_id FROM products WHERE sku='LPC-001'),  600,1080.00),
    (28, (SELECT product_id FROM products WHERE sku='CTS-001'),  3000, 600.00),
    (29, (SELECT product_id FROM products WHERE sku='SPM-001'),  50, 1025.00),
    (30, (SELECT product_id FROM products WHERE sku='EVB-001'),  5,  1250.00);

-- ============================================================
--  10. UPDATE item_emissions for each shipment item
--  (distance × weight_tonnes × emission_factor)
-- ============================================================
UPDATE shipment_items si
SET    item_emissions = (
    SELECT ROUND(s.distance_km * (si.weight_kg / 1000.0) * ef.co2_per_unit, 4)
    FROM   shipments       s
    JOIN   transport_modes tm ON tm.mode_id    = s.mode_id
    JOIN   emission_factors ef ON ef.entity_name = tm.mode_name
                               AND ef.entity_type = 'transport'
    WHERE  s.shipment_id = si.shipment_id
);

-- ============================================================
--  11. MARK DELIVERED SHIPMENTS — triggers eco_score updates
-- ============================================================
UPDATE shipments SET status = 'delivered' WHERE status = 'delivered';

-- ============================================================
--  12. GENERATE MONTHLY REPORTS for all months
-- ============================================================
CALL generate_monthly_report('2024-01-01');
CALL generate_monthly_report('2024-02-01');
CALL generate_monthly_report('2024-03-01');
CALL generate_monthly_report('2024-04-01');
CALL generate_monthly_report('2024-05-01');
CALL generate_monthly_report('2024-06-01');
CALL generate_monthly_report('2024-07-01');
CALL generate_monthly_report('2024-08-01');
CALL generate_monthly_report('2024-09-01');
CALL generate_monthly_report('2024-10-01');
CALL generate_monthly_report('2024-11-01');
CALL generate_monthly_report('2024-12-01');

-- ============================================================
--  QUICK VERIFICATION QUERIES (run these to confirm all good)
-- ============================================================
-- SELECT COUNT(*) FROM suppliers;           -- expect 8
-- SELECT COUNT(*) FROM products;            -- expect 16
-- SELECT COUNT(*) FROM shipments;           -- expect 30
-- SELECT COUNT(*) FROM shipment_items;      -- expect 32
-- SELECT COUNT(*) FROM emission_reports;    -- expect rows per month/supplier/category
-- SELECT * FROM v_supplier_performance ORDER BY eco_score DESC;
-- SELECT * FROM v_product_carbon;
DO $$ DECLARE r RECORD;
BEGIN
    FOR r IN SELECT product_id FROM products LOOP
        CALL CalculateProductFootprint(r.product_id);
    END LOOP;
END $$;
BEGIN;
    INSERT INTO shipments (...) VALUES (...) RETURNING shipment_id;
    INSERT INTO shipment_items (...) VALUES (...);
COMMIT;