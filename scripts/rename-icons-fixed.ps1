$ErrorActionPreference = "Stop"

$iconsDir = Join-Path $PSScriptRoot "..\icons"

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
    "Unity.svg" = "unity.svg"
    "Unreal Engine.svg" = "unreal-engine.svg"
    "Godot Engine.svg" = "godot-engine.svg"
    "Windows 11.svg" = "windows-11.svg"
    "Windows 8.svg" = "windows-8.svg"
    "Apple.svg" = "apple.svg"
}

# Rename files
foreach ($oldName in $renames.Keys) {
    $oldPath = Join-Path $iconsDir $oldName
    $newPath = Join-Path $iconsDir $renames[$oldName]
    
    if ((Test-Path $oldPath) -and !(Test-Path $newPath)) {
        Write-Host "Renaming $oldName to $($renames[$oldName])"
        Rename-Item -Path $oldPath -NewName $renames[$oldName] -ErrorAction Stop
    } elseif (Test-Path $oldPath) {
        Write-Host "Skipping $oldName - $($renames[$oldName]) already exists"
    } else {
        Write-Host "Could not find $oldName"
    }
}

Write-Host "All files have been processed."
