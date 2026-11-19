Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
exe = root & "\src-tauri\target\release\token-glass.exe"
If Not fso.FileExists(exe) Then exe = root & "\token-glass.exe"
WshShell.CurrentDirectory = root
WshShell.Run """" & exe & """", 0, False
