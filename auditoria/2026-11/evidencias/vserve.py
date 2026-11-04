# Servidor local que emula lo esencial de Vercel para pruebas: cabeceras de vercel.json, trailingSlash, index.html y 404.html
import http.server,json,os,re,sys,socketserver
root=os.path.abspath(sys.argv[1]); port=int(sys.argv[2])
cfg=json.load(open(os.path.join(root,'vercel.json'))) if os.path.exists(os.path.join(root,'vercel.json')) else {}
rules=[(re.compile('^'+r['source'].replace('(.*)','.*')+'$'),r['headers']) for r in cfg.get('headers',[])]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=root,**k)
    def log_message(s,*a): pass
    def end_headers(s):
        path=s.path.split('?')[0]
        for rx,hs in rules:
            if rx.match(path):
                for h in hs: s.send_header(h['key'],h['value'])
        super().end_headers()
    def send_head(s):
        path=s.path.split('?')[0]
        fs=os.path.join(root,path.lstrip('/'))
        if os.path.isdir(fs) and not path.endswith('/'):
            s.send_response(308); s.send_header('Location',path+'/'); s.end_headers(); return None
        if not os.path.exists(fs) and not (os.path.isdir(fs)):
            nf=os.path.join(root,'404.html')
            if os.path.exists(nf):
                b=open(nf,'rb').read(); s.send_response(404); s.send_header('Content-Type','text/html; charset=utf-8'); s.send_header('Content-Length',str(len(b))); s.end_headers()
                import io; return io.BytesIO(b)
        return super().send_head()
socketserver.TCPServer.allow_reuse_address=True
http.server.ThreadingHTTPServer(('127.0.0.1',port),H).serve_forever()
