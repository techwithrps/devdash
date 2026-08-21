-- Schema for Team Work Status Dashboard
CREATE TABLE IF NOT EXISTS work_entries (
    id SERIAL PRIMARY KEY,
    member_name VARCHAR(255) NOT NULL,
    codebase VARCHAR(255) NOT NULL,
    task VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    files JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'working', -- 'working' | 'completed'
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast status and search queries
CREATE INDEX IF NOT EXISTS idx_work_entries_status ON work_entries(status);
CREATE INDEX IF NOT EXISTS idx_work_entries_last_updated ON work_entries(last_updated DESC);

-- Seed initial records if table is empty
INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
SELECT 'Rahul Sharma', 'Fleet Management', 'attachVehicle()', 'Adding validation for vehicle attachment and improved error handling.', '["VehicleService.ts", "vehicleController.ts", "vehicleRoutes.ts", "Vehicle.ts", "VehicleForm.tsx"]'::jsonb, 'working', '2025-05-22 10:30:00+05:30', NULL
WHERE NOT EXISTS (SELECT 1 FROM work_entries);

INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
SELECT 'Amit Verma', 'College ERP', 'calculateFine()', 'Fine calculation logic based on new rules.', '["FeeService.ts", "fineCalculation.ts", "feeController.ts"]'::jsonb, 'working', '2025-05-22 09:15:00+05:30', NULL
WHERE (SELECT COUNT(*) FROM work_entries) = 1;

INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
SELECT 'Priya Mehta', 'ICEGATE Automation', 'signFile()', 'Integrating DSC and file signing API.', '["signService.ts", "fileSigner.ts", "icegateApi.ts", "utils.ts"]'::jsonb, 'working', '2025-05-22 09:05:00+05:30', NULL
WHERE (SELECT COUNT(*) FROM work_entries) = 2;

INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
SELECT 'Sandeep Kumar', 'Fleet Management', 'VehicleList.tsx', 'UI enhancements for vehicle list page.', '["VehicleList.tsx", "vehicleFilters.ts", "vehicleTypes.ts", "vehicleTable.tsx"]'::jsonb, 'completed', '2025-05-22 08:45:00+05:30', '2025-05-22 08:45:00+05:30'
WHERE (SELECT COUNT(*) FROM work_entries) = 3;

INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
SELECT 'Neha Singh', 'College ERP', 'generateReceipt()', 'Receipt generation format updated.', '["receiptService.ts", "receiptTemplate.html", "receiptController.ts"]'::jsonb, 'completed', '2025-05-22 08:20:00+05:30', '2025-05-22 08:20:00+05:30'
WHERE (SELECT COUNT(*) FROM work_entries) = 4;

INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
SELECT 'Vikas Patel', 'ElogiPark SQL', 'bedAllotment()', 'Fixing bed allotment conflict issue.', '["bedAllotment.ts", "bedService.ts", "allotmentController.ts"]'::jsonb, 'completed', '2025-05-22 08:10:00+05:30', '2025-05-22 08:10:00+05:30'
WHERE (SELECT COUNT(*) FROM work_entries) = 5;
