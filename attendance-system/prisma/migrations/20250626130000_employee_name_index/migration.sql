-- فهرس على اسم الموظف لتسريع البحث/الترتيب في التقارير وقائمة الموظفين
CREATE INDEX IF NOT EXISTS "Employee_name_idx" ON "Employee"("name");
