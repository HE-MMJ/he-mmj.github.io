"""Uji perilaku login di browser sungguhan (Chrome headless).

Jalankan dari folder tools/gabungan:
    python check_login_browser.py

Cara kerja: server statis (root repo) + server kecil yang menerima hasil uji.
Halaman probe menghitung statusnya lalu mengirimkannya lewat POST; test
menunggu file hasilnya. Cara ini tidak bergantung pada kapan Chrome selesai
mengambil dump DOM (jam virtual browser bisa membuat dump terjadi di tengah
parse, sehingga script body belum sempat jalan).

Keluar 0 = semua pemeriksaan lolos. Butuh Chrome/Edge terpasang.
"""
import os
import random
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))   # root repo (3 tingkat ke atas)
TMP = tempfile.mkdtemp(prefix="mmj-login-test-")
fails = []


def check(name, ok, detail=""):
    if ok:
        print("  PASS  " + name)
    else:
        print("  FAIL  " + name + ("  <- " + detail if detail else ""))
        fails.append(name)


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def find_chrome():
    for c in (r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"):
        if os.path.exists(c):
            return c
    return None


class Handler(SimpleHTTPRequestHandler):
    """Melayani root repo + halaman probe (/__probe/) + menerima hasil uji (POST)."""

    # saat aktif: /assets/js/auth.js dibalas 404 (untuk menguji halaman login
    # saat file auth.js gagal dimuat)
    fail_auth = False

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n).decode("utf-8", "replace") if n else ""
        name = self.path.split("/")[-1] or "hasil"
        with open(os.path.join(TMP, name + ".result"), "w", encoding="utf-8") as f:
            f.write(body)
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if Handler.fail_auth and self.path.startswith("/assets/js/auth.js"):
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if self.path.startswith("/__probe/"):
            name = self.path.split("/__probe/")[1].split("?")[0]
            p = os.path.join(TMP, name)
            if os.path.isfile(p):
                body = open(p, "rb").read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().do_GET()

    def log_message(self, *a):
        pass


def probe_file(name, html):
    """Buat halaman probe (disajikan di /__probe/, same-origin dengan situs)."""
    with open(os.path.join(TMP, name), "w", encoding="utf-8") as f:
        f.write(html)
    return "/__probe/" + name


def run_probe(chrome, base, name, html, wait_ms=12000):
    """Buka halaman probe; tunggu hasil yang dikirim balik lewat POST."""
    url = base + probe_file(name, html)
    pdir = os.path.join(TMP, "prof-%d" % random.randint(1, 999999))
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
           "--user-data-dir=" + pdir, "--hide-scrollbars", "--window-size=1280,760",
           "--virtual-time-budget=15000", "--dump-dom", url]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    finally:
        shutil.rmtree(pdir, ignore_errors=True)
    rp = os.path.join(TMP, name + ".result")
    deadline = time.time() + wait_ms / 1000.0
    while time.time() < deadline:
        if os.path.exists(rp):
            time.sleep(0.15)
            return open(rp, encoding="utf-8").read()
        time.sleep(0.25)
    return "(tidak ada hasil)"


def main():
    chrome = find_chrome()
    if not chrome:
        print("GAGAL: Chrome/Edge tidak ditemukan.")
        return 1

    auth_src = open(os.path.join(ROOT, "assets", "js", "auth.js"), encoding="utf-8").read()

    port = free_port()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%d" % port
    time.sleep(0.5)

    # helper JS: kirim hasil ke server
    SEND = ('function kirim(n,v){try{navigator.sendBeacon("/__result/"+n,v);}catch(e){}}')

    try:
        # ---------- 1) tanpa login: dashboard PUBLIK, tombol Masuk, menu izin hidden
        # dicek lewat iframe supaya tidak bergantung pada waktu parse halaman probe
        html = run_probe(chrome, base, "publik", """<!doctype html><meta charset="utf-8">
<iframe id="f" src="/index.html" style="width:1280px;height:760px;border:0"></iframe>
<script>
""" + SEND + """
var tries=0;
(function cek(){
  tries++;
  var d;
  try{ d=document.getElementById("f").contentDocument; }catch(e){}
  if(d && d.querySelectorAll(".app").length){
    kirim("publik","APP="+d.querySelectorAll(".app").length+
      " TPL="+d.querySelectorAll("template").length+
      " MASUK="+d.querySelectorAll(".mmj-user-in").length+
      " USER="+d.querySelectorAll(".mmj-user").length+
      " COST_HIDDEN="+d.querySelectorAll('[data-mmj-auth="costcontrol"][hidden]').length+
      " AUTH="+(d.defaultView.MMJ_AUTH?"ada":"takada")+
      " NOJS="+(d.getElementById("mmjNojs")?(d.getElementById("mmjNojs").hidden?"hidden":"tampil"):"takada"));
    return;
  }
  if(tries<60) setTimeout(cek,250);
})( );
</script>""")
        check("publik: dashboard tampil tanpa login", "APP=1" in html, html)
        check("publik: tombol Masuk ada", "MASUK=1" in html, html)
        check("publik: menu Cost Control tersembunyi", "COST_HIDDEN=3" in html, html)
        check("publik: auth.js termuat", "AUTH=ada" in html, html)
        check("publik: kotak peringatan no-JS tidak terlihat",
              ("NOJS=hidden" in html) or ("NOJS=takada" in html), html)

        # ---------- 2) sesi milik user yang sudah dihapus: tetap publik, tidak crash
        html = run_probe(chrome, base, "asing", """<!doctype html><meta charset="utf-8">
<iframe id="f" src="/index.html" style="width:1280px;height:760px;border:0"></iframe>
<script>
""" + SEND + """
try{ localStorage.setItem("mmjSession", JSON.stringify({id:"uX",name:"Asing",role:"admin",ts:Date.now()})); }catch(e){}
var tries=0;
(function cek(){
  tries++;
  var d; try{ d=document.getElementById("f").contentDocument; }catch(e){}
  if(d && d.querySelectorAll(".app").length){
    kirim("asing","APP="+d.querySelectorAll(".app").length+
      " ERR="+((d.defaultView.__ERR||[]).join(";")||"-"));
    return;
  }
  if(tries<60) setTimeout(cek,250);
})();
</script>""")
        check("sesi user asing: dashboard tetap tampil (publik)", "APP=1" in html, html)

        # ---------- 3) API auth: alasan kegagalan dibedakan (auth.js di-inline)
        html = run_probe(chrome, base, "api", """<!doctype html><meta charset="utf-8">
<script>
""" + auth_src + """
</script>
<script>
""" + SEND + """
var R=[];
R.push("sandi="+(MMJ_AUTH.login("admin","salah")===null)+":"+MMJ_AUTH.lastError);
R.push("user="+(MMJ_AUTH.login("bocah","apa")===null)+":"+MMJ_AUTH.lastError);
R.push("kapital="+(MMJ_AUTH.login("  ADMIN  ","mmj2026")!==null));
R.push("ingat="+(MMJ_AUTH.login("admin","mmj2026",true)!==null)+":"+MMJ_AUTH.lastRemember);
R.push("logout="+(MMJ_AUTH.logout()&&MMJ_AUTH.current()===null));
kirim("api", R.join(" "));
</script>""")
        check("api: sandi salah -> lastError=pass", "sandi=true:pass" in html, html)
        check("api: user asing -> lastError=user", "user=true:user" in html, html)
        check("api: username kapital+spasi diterima", "kapital=true" in html, html)
        check("api: logout mengosongkan sesi", "logout=true" in html, html)

        # ---------- 4) storage diblokir -> bukan crash, alasan 'storage'
        html = run_probe(chrome, base, "blocked", """<!doctype html><meta charset="utf-8">
<script>
try{Object.defineProperty(window,"localStorage",{get:function(){throw new Error("x")}});
Object.defineProperty(window,"sessionStorage",{get:function(){throw new Error("x")}});}catch(e){}
</script>
<script>
""" + auth_src + """
</script>
<script>
""" + SEND + """
var r="";try{ r="ok="+(MMJ_AUTH.login("admin","mmj2026")===null)+":"+MMJ_AUTH.lastError; }
catch(e){ r="EXCEPTION:"+e.message; }
kirim("blocked", r);
</script>""")
        check("storage diblokir: tanpa crash, lastError=storage", "ok=true:storage" in html, html)

        # ---------- 5) localStorage diblokir saja -> "ingat saya" turun kelas terdeteksi
        html = run_probe(chrome, base, "remember", """<!doctype html><meta charset="utf-8">
<script>
try{Object.defineProperty(window,"localStorage",{get:function(){throw new Error("x")}});}catch(e){}
</script>
<script>
""" + auth_src + """
</script>
<script>
""" + SEND + """
var r="";try{ r="ok="+(MMJ_AUTH.login("admin","mmj2026",true)!==null)+":ingat="+MMJ_AUTH.lastRemember; }
catch(e){ r="EXCEPTION:"+e.message; }
kirim("remember", r);
</script>""")
        check("ingat-saya turun kelas terdeteksi (lastRemember=false)",
              "ok=true:ingat=false" in html, html)

        # ---------- 6) auth.js gagal dimuat -> halaman login memberi pesan
        Handler.fail_auth = True
        html = run_probe(chrome, base, "noauth", """<!doctype html><meta charset="utf-8">
<iframe id="f" src="/login.html" style="width:900px;height:700px;border:0"></iframe>
<script>
""" + SEND + """
var tries=0;
(function cek(){
  tries++;
  var d; try{ d=document.getElementById("f").contentDocument; }catch(e){}
  if(d && d.getElementById("uUser")){
    d.getElementById("uUser").value="admin";
    d.getElementById("uPass").value="mmj2026";
    var f=d.getElementById("fLogin");
    f.dispatchEvent(new d.defaultView.Event("submit",{cancelable:true,bubbles:true}));
    setTimeout(function(){
      var e=d.getElementById("errMsg");
      kirim("noauth","ADA_PESAN="+(e && !e.hidden ? "ya" : "tidak")+
        " TEKS="+((e&&e.textContent)||"").slice(0,45));
    },400);
    return;
  }
  if(tries<60) setTimeout(cek,250);
})();
</script>""")
        Handler.fail_auth = False
        check("auth.js gagal dimuat: halaman login memberi pesan",
              "ADA_PESAN=ya" in html, html)

        # ---------- 7) tombol Keluar -> langsung ke halaman utama (dashboard publik)
        html = run_probe(chrome, base, "keluar", """<!doctype html><meta charset="utf-8">
<iframe id="f" src="/index.html" style="width:1280px;height:760px;border:0"></iframe>
<script>
""" + SEND + """
try{ localStorage.setItem("mmjSession", JSON.stringify({id:"u1",name:"Rizualdi Fadli",role:"admin",ts:Date.now()})); }catch(e){}
var tries=0;
(function cek(){
  tries++;
  var d; try{ d=document.getElementById("f").contentDocument; }catch(e){}
  if(d && d.querySelector(".mmj-user-out")){
    d.querySelector(".mmj-user-out").click();
    setTimeout(function(){
      var fr=document.getElementById("f");
      var path="-",masuk=-1;
      try{ path=fr.contentWindow.location.pathname; }catch(e){}
      try{ masuk=fr.contentDocument.querySelectorAll(".mmj-user-in").length; }catch(e){}
      kirim("keluar","PATH="+path+
        " SESI="+(localStorage.getItem("mmjSession")||"KOSONG")+
        " MASUK="+masuk);
    },1200);
    return;
  }
  if(tries<60) setTimeout(cek,250);
})();
</script>""")
        check("tombol Keluar: kembali ke halaman utama", "PATH=/index.html" in html, html)
        check("tombol Keluar: sesi dibersihkan", "SESI=KOSONG" in html, html)
        check("tombol Keluar: tombol Masuk muncul lagi", "MASUK=1" in html, html)
    finally:
        httpd.shutdown()
        shutil.rmtree(TMP, ignore_errors=True)

    print("")
    if fails:
        print("GAGAL (%d):" % len(fails))
        for f in fails:
            print("  - " + f)
        return 1
    print("OK: seluruh pemeriksaan perilaku login lolos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
