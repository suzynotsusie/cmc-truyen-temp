# Script chuyen Issue tu ThanhNT2k/web-app-project sang suzynotsusie/cmc-truyen-temp chuẩn UTF-8
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Ep Encoding UTF-8 cho PowerShell console va Output Engine
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$SRC = "ThanhNT2k/web-app-project"
$DST = "suzynotsusie/cmc-truyen-temp"
$LIMIT = 1000

Write-Host "1. Dang lay danh sach Issue tu $SRC..." -ForegroundColor Cyan
$srcIssuesRaw = gh issue list -R $SRC --state all --limit $LIMIT --json number,title,body,state,labels,assignees,author,url,createdAt,updatedAt
$srcIssuesJson = $srcIssuesRaw | ConvertFrom-Json

if ($null -eq $srcIssuesJson -or $srcIssuesJson.Count -eq 0) {
    Write-Host "Khong tim thay Issue nao trong $SRC." -ForegroundColor Yellow
    exit
}

Write-Host "Da tim thay $($srcIssuesJson.Count) issues." -ForegroundColor Green

# Lay danh sach Collaborators cua repo dich
Write-Host "2. Dang lay danh sach Collaborators cua repo dich $DST..." -ForegroundColor Cyan
try {
    $collabsJson = gh api -H "Accept: application/vnd.github+json" "/repos/$DST/collaborators?per_page=100" | ConvertFrom-Json
    $dstCollabs = $collabsJson.login
} catch {
    $dstCollabs = @()
}

$mapping = @()
$tempBodyFile = [System.IO.Path]::GetTempFileName()
$tempTitleFile = [System.IO.Path]::GetTempFileName()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($issue in $srcIssuesJson) {
    $number = $issue.number
    $title = $issue.title
    $body = if ($issue.body) { $issue.body } else { "" }
    $state = $issue.state
    $srcUrl = $issue.url
    $author = if ($issue.author) { $issue.author.login } else { "unknown" }
    $createdAt = $issue.createdAt
    $updatedAt = $issue.updatedAt

    Write-Host "`n---> Dang chuyen Issue #${number}: $title" -ForegroundColor Yellow

    # Tao footer thong tin issue cu
    $footer = "`n`n---`n" +
              "Migrated from: $srcUrl`n" +
              "Original issue: #$number`n" +
              "Original author: @$author`n" +
              "Original createdAt: $createdAt`n" +
              "Original updatedAt: $updatedAt`n"

    $newBody = $body + $footer

    # Ghi file bang chuuan UTF8 No BOM
    [System.IO.File]::WriteAllText($tempBodyFile, $newBody, $utf8NoBom)
    [System.IO.File]::WriteAllText($tempTitleFile, $title, $utf8NoBom)

    # Tao Issue moi ben Target repo bang file UTF-8
    $titleContent = Get-Content -Path $tempTitleFile -Raw -Encoding UTF8
    $dstUrl = gh issue create -R $DST --title "$titleContent" --body-file $tempBodyFile
    $dstNumber = ($dstUrl -split '/')[-1]

    # Xu ly Labels
    if ($issue.labels -and $issue.labels.Count -gt 0) {
        foreach ($labelObj in $issue.labels) {
            $labelName = $labelObj.name
            gh label create "$labelName" -R $DST --force 2>$null
            gh issue edit "$dstNumber" -R $DST --add-label "$labelName" 2>$null
        }
    }

    # Xu ly Assignees
    if ($issue.assignees -and $issue.assignees.Count -gt 0) {
        $validAssignees = @()
        foreach ($assigneeObj in $issue.assignees) {
            $aName = $assigneeObj.login
            if ($dstCollabs -contains $aName) {
                $validAssignees += $aName
            } else {
                Write-Host "  - Bo qua assignee @$aName (khong co trong $DST)" -ForegroundColor Gray
            }
        }
        if ($validAssignees.Count -gt 0) {
            $joinedAssignees = $validAssignees -join ","
            gh issue edit "$dstNumber" -R $DST --add-assignee "$joinedAssignees" 2>$null
        }
    }

    # Dong Issue neu ben repo cu da CLOSED
    if ($state -eq "CLOSED") {
        gh issue close "$dstNumber" -R $DST 2>$null
    }

    $mapping += [PSCustomObject]@{
        src_number = $number
        src_url    = $srcUrl
        dst_number = $dstNumber
        dst_url    = $dstUrl
    }
}

if (Test-Path $tempBodyFile) { Remove-Item $tempBodyFile }
if (Test-Path $tempTitleFile) { Remove-Item $tempTitleFile }

$mapping | Export-Csv -Path ".\issue_mapping.csv" -NoTypeInformation -Encoding UTF8
Write-Host "`nDA HOAN THANH CHUYEN ISSUE!" -ForegroundColor Green
Write-Host "File mapping duoc luu tai: .\issue_mapping.csv" -ForegroundColor Green
