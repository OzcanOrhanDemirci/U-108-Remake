// U-108 kabuğu: oyunu WebView2 içinde tam ekran açar ve ona masaüstüyle konuşma yetenekleri verir
// (hafıza dosyası, ortam bilgisi, masaüstüne mektup, pencere başlığı, kapanış).
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace U108;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new Pencere());
    }
}

sealed class Pencere : Form
{
    readonly WebView2 web = new() { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.Black };
    static readonly string Veri = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "U-108");
    static readonly string HafizaYolu = Environment.GetEnvironmentVariable("U108_TEST") == "1"
        ? Path.Combine(Path.GetTempPath(), "u108_test", "hafiza.json")
        : Path.Combine(Veri, "hafiza.json");
    bool tamEkran = true;
    Rectangle eskiSinir;
    // Test kipi (U108_TEST=1): ekran dışında, sessiz, odak almadan açılır; köprüyü sınar, görüntü alır, kapanır.
    static readonly bool Test = Environment.GetEnvironmentVariable("U108_TEST") == "1";
    static readonly string TestCikti = Path.Combine(Path.GetTempPath(), "u108_test");
    protected override bool ShowWithoutActivation => Test;

    public Pencere()
    {
        Text = "Bootcamp Projesinden Kacis";
        BackColor = Color.Black;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(1600, 900);
        KeyPreview = true;
        Controls.Add(web);
        if (Test)
        {
            ShowInTaskbar = false;
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.Manual;
            Bounds = new Rectangle(-4000, -4000, 1280, 720);
            Directory.CreateDirectory(TestCikti);
        }
        else TamEkran(true);
        Load += async (_, _) => await Baslat();
    }

    void TamEkran(bool ac)
    {
        tamEkran = ac;
        if (ac)
        {
            eskiSinir = Bounds;
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Normal;
            Bounds = Screen.FromControl(this).Bounds;
        }
        else
        {
            FormBorderStyle = FormBorderStyle.Sizable;
            Bounds = eskiSinir.Width > 0 ? eskiSinir : new Rectangle(100, 100, 1600, 900);
        }
    }

    async Task Baslat()
    {
        Directory.CreateDirectory(Veri);
        var secenek = new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required --disable-features=msSmartScreenProtection");
        var ortam = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "U-108", "WebView2"), secenek);
        await web.EnsureCoreWebView2Async(ortam);
        var c = web.CoreWebView2;
        c.Settings.AreDefaultContextMenusEnabled = false;
        c.Settings.AreDevToolsEnabled = Debugger.IsAttached || Environment.GetEnvironmentVariable("U108_DEV") == "1";
        c.Settings.IsZoomControlEnabled = false;
        c.Settings.IsStatusBarEnabled = false;
        c.Settings.AreBrowserAcceleratorKeysEnabled = false;
        var oyun = Path.Combine(AppContext.BaseDirectory, "oyun");
        c.SetVirtualHostNameToFolderMapping("u108.oyun", oyun, CoreWebView2HostResourceAccessKind.Allow);
        c.WebMessageReceived += Ileti;
        c.DocumentTitleChanged += (_, _) => { };
        web.KeyDown += (_, e) => { if (e.KeyCode == Keys.F11) TamEkran(!tamEkran); };
        if (Test)
        {
            c.IsMuted = true;
            var sahne = Environment.GetEnvironmentVariable("U108_SAHNE") ?? "";
            c.Navigate("https://u108.oyun/index.html" + (sahne.Length > 0 ? "?" + sahne : "") + "#kabuktesti");
            _ = TestZamanlayici();
        }
        else c.Navigate("https://u108.oyun/index.html");
    }

    void Ileti(object? s, CoreWebView2WebMessageReceivedEventArgs e)
    {
        JsonNode? m;
        try { m = JsonNode.Parse(e.WebMessageAsJson); } catch { return; }
        if (m is null) return;
        var id = m["id"]?.GetValue<int>() ?? 0;
        var op = m["op"]?.GetValue<string>() ?? "";
        JsonNode? veri = null;
        var ok = true;
        try
        {
            switch (op)
            {
                case "env": veri = Ortam(); break;
                case "hafizaOku": veri = File.Exists(HafizaYolu) ? JsonValue.Create(File.ReadAllText(HafizaYolu)) : null; break;
                case "hafizaYaz":
                    {
                        var d = m["data"]?.GetValue<string>() ?? "";
                        var tmp = HafizaYolu + ".tmp";
                        File.WriteAllText(tmp, d);
                        File.Move(tmp, HafizaYolu, true);
                        break;
                    }
                case "mektup": veri = Mektup(m["name"]?.GetValue<string>() ?? "mektup.txt", m["text"]?.GetValue<string>() ?? ""); break;
                case "baslik": Text = m["text"]?.GetValue<string>() ?? Text; break;
                case "kapat": BeginInvoke(() => Close()); break;
                case "tamEkran": TamEkran(m["on"]?.GetValue<bool>() ?? true); break;
                case "testSonuc":
                    File.WriteAllText(Path.Combine(TestCikti, "sonuc.json"), m["data"]?.ToJsonString() ?? "null");
                    break;
                case "orijinaliAc":
                    {
                        var exe = OrijinalYol();
                        if (File.Exists(exe)) Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(exe)! });
                        else ok = false;
                        break;
                    }
                default: ok = false; break;
            }
        }
        catch (Exception ex) { ok = false; veri = JsonValue.Create(ex.Message); }
        var cevap = new JsonObject { ["id"] = id, ["ok"] = ok, ["data"] = veri };
        web.CoreWebView2.PostWebMessageAsJson(cevap.ToJsonString());
    }

    async Task TestZamanlayici()
    {
        var bekle = int.TryParse(Environment.GetEnvironmentVariable("U108_BEKLE"), out var b) ? b : 8;
        await Task.Delay(bekle * 1000);
        try
        {
            using var fs = File.Create(Path.Combine(TestCikti, "goruntu.png"));
            await web.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, fs);
        }
        catch (Exception ex) { File.WriteAllText(Path.Combine(TestCikti, "hata.txt"), ex.ToString()); }
        Close();
    }

    static string Masaustu() => Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
    static string OrijinalYol() => Path.Combine(Masaustu(), "U-108", "U-108_Build_1.1", "Bootcamp Projesinden Kacis.exe");

    static JsonNode Ortam()
    {
        var exe = OrijinalYol();
        var var_ = File.Exists(exe);
        return new JsonObject
        {
            ["user"] = Environment.UserName,
            ["displayName"] = "",
            ["now"] = DateTime.Now.ToString("o"),
            ["originalExists"] = var_,
            ["originalPath"] = exe,
            ["originalBuild"] = var_ ? File.GetLastWriteTime(exe).ToString("o") : "",
            ["desktop"] = Masaustu(),
            ["memoryPath"] = HafizaYolu,
        };
    }

    static JsonNode Mektup(string ad, string metin)
    {
        foreach (var ch in Path.GetInvalidFileNameChars()) ad = ad.Replace(ch, '_');
        var klasor = Test ? TestCikti : Masaustu();
        var yol = Path.Combine(klasor, ad);
        if (File.Exists(yol))
        {
            var kok = Path.GetFileNameWithoutExtension(ad);
            for (var i = 2; File.Exists(yol); i++) yol = Path.Combine(klasor, $"{kok} ({i}).txt");
        }
        File.WriteAllText(yol, metin, new System.Text.UTF8Encoding(true));
        return JsonValue.Create(yol)!;
    }
}
