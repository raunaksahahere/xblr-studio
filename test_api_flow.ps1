# Automated API Integration Verification Script

Write-Host "========================================="
Write-Host "  AI XBRL Studio API Integration Tests"
Write-Host "========================================="

$BaseUrl = "http://localhost:5000/api"

# 1. Login
Write-Host "`n[Test 1] Logging in as default Reviewer..."
$Body = @{
    email = "reviewer@xbrlstudio.com"
    password = "ReviewerSecretPass123"
} | ConvertTo-Json

try {
    $LoginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $Body -ContentType "application/json"
    $Token = $LoginRes.accessToken
    Write-Host "✔ Login successful! Logged in as: $($LoginRes.user.name)"
} catch {
    Write-Error "✖ Login failed: $_"
    exit 1
}

$Headers = @{
    "Authorization" = "Bearer $Token"
}

# 2. Get active projects
Write-Host "`n[Test 2] Querying active filing projects..."
try {
    $Projects = Invoke-RestMethod -Uri "$BaseUrl/projects" -Method Get -Headers $Headers
    Write-Host "✔ Found $($Projects.Length) active projects."
    $Project = $Projects[0]
    $ProjectId = $Project.id
    $CompanyId = $Project.companyId
    Write-Host "✔ Selected Project ID: $ProjectId (Company: $($Project.company.name))"
} catch {
    Write-Error "✖ Query projects failed: $_"
    exit 1
}

# 3. Upload Document
Write-Host "`n[Test 3] Uploading dummy financial document..."
$FilePath = Join-Path -Path $PSScriptRoot -ChildPath "dummy_report.pdf"

if (-not (Test-Path $FilePath)) {
    Write-Error "✖ Test file not found: $FilePath"
    exit 1
}

# Construct Multipart form-data payload in PowerShell
$LF = "`r`n"
$Boundary = [System.Guid]::NewGuid().ToString()
$FileBytes = [System.IO.File]::ReadAllBytes($FilePath)
$FileName = [System.IO.Path]::GetFileName($FilePath)

$BodyBuilder = [System.Text.StringBuilder]::new()
$BodyBuilder.Append("--$Boundary$LF") | Out-Null
$BodyBuilder.Append("Content-Disposition: form-data; name=`"projectId`"$LF$LF") | Out-Null
$BodyBuilder.Append("$ProjectId$LF") | Out-Null

$BodyBuilder.Append("--$Boundary$LF") | Out-Null
$BodyBuilder.Append("Content-Disposition: form-data; name=`"companyId`"$LF$LF") | Out-Null
$BodyBuilder.Append("$CompanyId$LF") | Out-Null

$BodyBuilder.Append("--$Boundary$LF") | Out-Null
$BodyBuilder.Append("Content-Disposition: form-data; name=`"financialYear`"$LF$LF") | Out-Null
$BodyBuilder.Append("2024-2025$LF") | Out-Null

$BodyBuilder.Append("--$Boundary$LF") | Out-Null
$BodyBuilder.Append("Content-Disposition: form-data; name=`"file`"; filename=`"$FileName`"$LF") | Out-Null
$BodyBuilder.Append("Content-Type: application/pdf$LF$LF") | Out-Null

$HeaderBytes = [System.Text.Encoding]::UTF8.GetBytes($BodyBuilder.ToString())
$TrailerBytes = [System.Text.Encoding]::UTF8.GetBytes("$LF--$Boundary--$LF")

$TotalLength = $HeaderBytes.Length + $FileBytes.Length + $TrailerBytes.Length
$RequestBytes = New-Object Byte[] $TotalLength

[System.Buffer]::BlockCopy($HeaderBytes, 0, $RequestBytes, 0, $HeaderBytes.Length)
[System.Buffer]::BlockCopy($FileBytes, 0, $RequestBytes, $HeaderBytes.Length, $FileBytes.Length)
[System.Buffer]::BlockCopy($TrailerBytes, 0, $RequestBytes, ($HeaderBytes.Length + $FileBytes.Length), $TrailerBytes.Length)

$Headers.Add("Content-Type", "multipart/form-data; boundary=$Boundary")

try {
    $UploadRes = Invoke-RestMethod -Uri "$BaseUrl/documents" -Method Post -Headers $Headers -Body $RequestBytes
    Write-Host "✔ Document upload successful! queued for background parsing."
} catch {
    Write-Error "✖ Upload failed: $_"
    exit 1
}

# Wait for background queue simulation (OCR + Extraction + Validation)
Write-Host "`nWaiting 5 seconds for simulated background worker queue pipeline to complete..."
Start-Sleep -Seconds 5

# Remove Content-Type header before next requests since they are JSON
$Headers.Remove("Content-Type")

# 4. Fetch details to check extracted facts & validation errors
Write-Host "`n[Test 4] Verifying parsed facts and calculation warnings..."
try {
    $ProjDetails = Invoke-RestMethod -Uri "$BaseUrl/projects/$ProjectId" -Method Get -Headers $Headers
    $Facts = $ProjDetails.financialStatements[0].parsedFacts
    $Errors = $ProjDetails.validationErrors

    Write-Host "✔ Extracted Facts count: $($Facts.Length)"
    foreach ($f in $Facts) {
        Write-Host "  Fact: $($f.factKey) = $($f.factValue) (Confidence: $($f.confidence)%)"
    }

    Write-Host "✔ Active Validation errors count: $($Errors.Length)"
    foreach ($e in $Errors) {
        Write-Host "  [$($e.errorCode)] ($($e.severity)) : $($e.message)"
    }
} catch {
    Write-Error "✖ Querying project details failed: $_"
    exit 1
}

# 5. Perform review override on Liabilities
Write-Host "`n[Test 5] Overriding Liabilities fact value..."
$LiabilitiesFact = $Facts | Where-Object { $_.factKey -eq "Liabilities" }
if (-not $LiabilitiesFact) {
    Write-Error "✖ Liabilities fact not found in extracted output."
    exit 1
}

$OverrideBody = @{
    newValue = "4000000"
    comment = "Liabilities adjustment override"
} | ConvertTo-Json

try {
    $OverrideRes = Invoke-RestMethod -Uri "$BaseUrl/reviews/$($LiabilitiesFact.id)/override" -Method Put -Headers $Headers -Body $OverrideBody -ContentType "application/json"
    Write-Host "✔ Override successful! New value: $($OverrideRes.fact.overriddenValue)"
} catch {
    Write-Error "✖ Override request failed: $_"
    exit 1
}

# 6. Re-fetch errors to check if calculations mismatch is cleared
Write-Host "`n[Test 6] Re-evaluating calculation integrity checks..."
try {
    # Trigger a recalculation check by fetching updated validation error lists
    $ValidationRes = Invoke-RestMethod -Uri "$BaseUrl/validations/$ProjectId" -Method Get -Headers $Headers
    $ActiveErrors = $ValidationRes | Where-Object { $_.isCleared -eq $false }
    Write-Host "✔ Active validation errors after override: $($ActiveErrors.Length)"
    if ($ActiveErrors.Length -lt $Errors.Length) {
        Write-Host "✔ Mismatch validation error cleared successfully! Calculations are integrated."
    }
} catch {
    Write-Error "✖ Verification failed: $_"
    exit 1
}

Write-Host "`n========================================="
Write-Host "  ALL API TESTS COMPLETED SUCCESSFULLY!"
Write-Host "========================================="
