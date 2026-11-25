// FCC.exe at the install root (same layout as FAH): the root holds only this launcher, the licenses and folders.
// The real program (Electron + its ~20 runtime files) lives in modulos\FCC.exe; this one starts it with the same
// arguments (copied verbatim from the command line) and exits. Built by ferramentas\empacotar.js with the .NET Framework
// csc.exe that every Windows 10/11 has (no runtime to install).
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("FCC - finjackin Claude Center")]
[assembly: AssemblyProduct("FCC")]
[assembly: AssemblyCompany("finjackin")]

static class Lancador
{
    [STAThread]
    static int Main()
    {
        string raiz = AppDomain.CurrentDomain.BaseDirectory;
        string exe = Path.Combine(Path.Combine(raiz, "modulos"), "FCC.exe");
        if (!File.Exists(exe))
        {
            MessageBox.Show("Falta a pasta \"modulos\" do FCC (ou o FCC.exe dentro dela).\n\nBaixe o FCC de novo e substitua a pasta.", "FCC", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo(exe, Argumentos());
            psi.UseShellExecute = false;
            psi.WorkingDirectory = raiz;
            Process.Start(psi);
            return 0;
        }
        catch (Exception e)
        {
            MessageBox.Show("Não consegui abrir o FCC:\n" + e.Message, "FCC", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    // everything after the program's own name, untouched (keeps the caller's quoting)
    static string Argumentos()
    {
        string c = Environment.CommandLine.TrimStart();
        int i;
        if (c.StartsWith("\"")) { i = c.IndexOf('"', 1); i = i < 0 ? c.Length : i + 1; }
        else { i = c.IndexOf(' '); if (i < 0) i = c.Length; }
        return c.Substring(i).TrimStart();
    }
}
