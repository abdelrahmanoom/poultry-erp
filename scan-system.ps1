# =====================================================
# SYSTEM MAP SCANNER - poultry-erp
# Run: .\scan-system.ps1
# Output: SYSTEM-MAP.txt
# =====================================================
$ErrorActionPreference = "SilentlyContinue"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
Set-Location $root

$out = Join-Path $root "SYSTEM-MAP.txt"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$L = New-Object System.Collections.ArrayList
function Add { param($s) [void]$L.Add([string]$s) }

Add ("=" * 78)
Add "SYSTEM MAP - poultry-erp"
Add "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add "Root: $root"
Add ("=" * 78)

# [1] package.json
Add ""
Add "[1] PACKAGE.JSON"
Add ("-" * 78)
if (Test-Path "package.json") { Add (Get-Content "package.json" -Raw) }

# [2] ENV
Add ""
Add "[2] ENV (masked)"
Add ("-" * 78)
if (Test-Path ".env.local") {
  Get-Content ".env.local" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') { Add "$($matches[1])=***" }
  }
}

# [3] Files tree
Add ""
Add "[3] PROJECT FILES (with line counts)"
Add ("-" * 78)
foreach ($d in @("app","components","lib","public","scripts")) {
  if (Test-Path $d) {
    Add "-- $d --"
    Get-ChildItem $d -Recurse -File | Sort-Object FullName | ForEach-Object {
      $rel = $_.FullName.Replace($root + '\','')
      $cnt = @(Get-Content $_.FullName).Count
      Add "  $rel  [$cnt lines]"
    }
    Add ""
  }
}

# [4] Per-page deep dive
Add ""
Add "[4] PAGE-BY-PAGE ANALYSIS"
Add ("=" * 78)
$pages = Get-ChildItem "app" -Recurse -File -Include *.tsx | Sort-Object FullName
foreach ($p in $pages) {
  $rel = $p.FullName.Replace($root + '\','')
  $ls = @(Get-Content $p.FullName)
  Add ""
  Add "########## $rel ##########"

  Add "-- useState --"
  for ($i=0; $i -lt $ls.Count; $i++) {
    if ($ls[$i] -match 'const \[.*\] = useState') { Add "  L$($i+1): $($ls[$i].Trim())" }
  }

  Add "-- useEffect --"
  for ($i=0; $i -lt $ls.Count; $i++) {
    if ($ls[$i] -match 'useEffect') { Add "  L$($i+1): $($ls[$i].Trim())" }
  }

  Add "-- async functions --"
  for ($i=0; $i -lt $ls.Count; $i++) {
    if ($ls[$i] -match 'const \w+ = async|async function') { Add "  L$($i+1): $($ls[$i].Trim())" }
  }

  Add "-- supabase (from/rpc) --"
  for ($i=0; $i -lt $ls.Count; $i++) {
    if ($ls[$i] -match "\.from\(|\.rpc\(") { Add "  L$($i+1): $($ls[$i].Trim())" }
  }

  Add "-- tabs/navigation --"
  for ($i=0; $i -lt $ls.Count; $i++) {
    if ($ls[$i] -match "setActiveTab|setActiveView|setOpeningSubTab|setSubTab|router\.push|useRouter\(") {
      Add "  L$($i+1): $($ls[$i].Trim())"
    }
  }

  Add "-- headers/titles --"
  for ($i=0; $i -lt $ls.Count; $i++) {
    if ($ls[$i] -match '<h1|<h2|<h3|<h4') { Add "  L$($i+1): $($ls[$i].Trim())" }
  }

  Add "-- modals --"
  for ($i=0; $i -lt $ls.Count; $i++) {
    if ($ls[$i] -match 'const \[show.*Modal|const \[.*Detail,') { Add "  L$($i+1): $($ls[$i].Trim())" }
  }
}

# [5] lucide imports
Add ""
Add "[5] LUCIDE IMPORTS PER FILE"
Add ("=" * 78)
Get-ChildItem "app","components" -Recurse -File -Include *.tsx | ForEach-Object {
  $file = $_
  $imports = Select-String -Path $file.FullName -Pattern "from 'lucide-react'" -SimpleMatch
  if ($imports) {
    $rel = $file.FullName.Replace($root + '\','')
    Add "-- $rel --"
    $imports | ForEach-Object { Add "  $($_.Line.Trim())" }
  }
}

# [6] tables/rpc
Add ""
Add "[6] SUPABASE TABLES & RPC (extracted from code)"
Add ("=" * 78)
$tables = @{}
$rpcs = @{}
Get-ChildItem "app","components","lib" -Recurse -File -Include *.tsx,*.ts | ForEach-Object {
  $raw = Get-Content $_.FullName -Raw
  [regex]::Matches($raw, "from\('([a-z_]+)'\)") | ForEach-Object { $tables[$_.Groups[1].Value] = 1 }
  [regex]::Matches($raw, "rpc\('([a-z_]+)'")    | ForEach-Object { $rpcs[$_.Groups[1].Value]    = 1 }
}
Add "TABLES: " + (($tables.Keys | Sort-Object) -join ", ")
Add ""
Add "RPCs: " + (($rpcs.Keys | Sort-Object) -join ", ")

# [7] SQL for schema
Add ""
Add "[7] SQL FOR FULL DB SCHEMA (run in Supabase SQL Editor, then paste result here):"
Add ("=" * 78)
Add "SELECT t.table_name,"
Add "  string_agg(c.column_name || ' (' || c.data_type || ')', ', ' ORDER BY c.ordinal_position) as columns"
Add "FROM information_schema.tables t"
Add "JOIN information_schema.columns c ON c.table_name = t.table_name"
Add "WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'"
Add "GROUP BY t.table_name ORDER BY t.table_name;"
Add ""
Add "SELECT routine_name FROM information_schema.routines"
Add "WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name;"

# Footer
Add ""
Add ("=" * 78)
Add "END OF SYSTEM MAP"
Add ("=" * 78)

[System.IO.File]::WriteAllText($out, ($L -join "`r`n"), $utf8)

Write-Host ""
Write-Host "========================================="
Write-Host "  OK: $out"
Write-Host "  Size: $((Get-Item $out).Length) bytes"
Write-Host "  Lines: $($L.Count)"
Write-Host "========================================="
Write-Host ""
Write-Host "Ø§ÙØªØ­Ù‡ Ø¨Ù€:  notepad SYSTEM-MAP.txt"
Write-Host "Ø£Ùˆ:        code SYSTEM-MAP.txt"