$ErrorActionPreference = "Stop"
$env:PGPASSWORD = $env:SUPABASE_DB_PASSWORD
if (-not $env:PGPASSWORD) { Write-Error "Set SUPABASE_DB_PASSWORD first"; exit 1 }
$migrations = @(
    "migrations\001_core_tables.sql",
    "migrations\002_pipeline_tables.sql",
    "migrations\003_indexes.sql",
    "migrations\005_functions.sql",
    "migrations\004_rls.sql",
    "migrations\006_rls_fix.sql"
)
foreach ($file in $migrations) {
    $path = "E:\Linup v2\$file"
    Write-Host "Applying $file ..." -ForegroundColor Cyan
    & psql -h aws-0-eu-west-1.pooler.supabase.com -p 5432 -U "postgres.qaifggocqcfhdgiwcvej" -d postgres -f $path
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed: $file"; exit 1 }
    Write-Host "OK: $file" -ForegroundColor Green
}
Write-Host "All migrations applied." -ForegroundColor Green