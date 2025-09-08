$iconsDir = "$PSScriptRoot\..\icons"

# Create a hashtable of old and new filenames
$renames = @{
    "Unity.png" = "unity.png"
    "Unreal Engine.png" = "unreal-engine.png"
    "Godot Engine.png" = "godot-engine.png"
    "C# (CSharp).png" = "csharp.png"
    "Java.png" = "java.png"
    "HTML5.png" = "html5.png"
    "CSS3.png" = "css3.png"
    "Visual Studio Code (VS Code).png" = "vscode.png"
    "Rider.png" = "rider.png"
    "Eclipse IDE.png" = "eclipse-ide.png"
    "Git.png" = "git.png"
    "GitHub.png" = "github.png"
    "Adobe Photoshop.png" = "adobe-photoshop.png"
    "Adobe Premiere Pro.png" = "adobe-premiere-pro.png"
    "Blender.png" = "blender.png"
    "Figma.png" = "figma.png"
    "unnamed.jpg" = "profile.jpg"
}

# Rename files
foreach ($oldName in $renames.Keys) {
    $oldPath = Join-Path $iconsDir $oldName
    $newPath = Join-Path $iconsDir $renames[$oldName]
    
    if (Test-Path $oldPath -and !(Test-Path $newPath)) {
        Rename-Item -Path $oldPath -NewName $renames[$oldName]
        Write-Host "Renamed $oldName to $($renames[$oldName])"
    } elseif (Test-Path $oldPath) {
        Write-Host "Skipping $oldName - $($renames[$oldName]) already exists"
    } else {
        Write-Host "Could not find $oldName"
    }
}

# Also rename SVG files
$svgRenames = @{
    "Unity.svg" = "unity.svg"
    "Unreal Engine.svg" = "unreal-engine.svg"
    "Godot Engine.svg" = "godot-engine.svg"
    "Windows 11.svg" = "windows-11.svg"
    "Windows 8.svg" = "windows-8.svg"
    "Apple.svg" = "apple.svg"
}

foreach ($oldName in $svgRenames.Keys) {
    $oldPath = Join-Path $iconsDir $oldName
    $newPath = Join-Path $iconsDir $svgRenames[$oldName]
    
    if (Test-Path $oldPath -and !(Test-Path $newPath)) {
        Rename-Item -Path $oldPath -NewName $svgRenames[$oldName]
        Write-Host "Renamed $oldName to $($svgRenames[$oldName])"
    } elseif (Test-Path $oldPath) {
        Write-Host "Skipping $oldName - $($svgRenames[$oldName]) already exists"
    } else {
        Write-Host "Could not find $oldName"
    }
}
