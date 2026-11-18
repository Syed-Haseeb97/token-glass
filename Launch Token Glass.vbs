Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\projects\token-glass"
WshShell.Run """D:\projects\token-glass\src-tauri\target\release\token-glass.exe""", 0, False
