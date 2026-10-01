#!/usr/bin/env python3
"""
GitDigest - Local Development & Production Server
Serves static assets with correct MIME types and CORS support.
"""

import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class GitDigestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server(port=PORT):
    for p in range(port, port + 20):
        try:
            with socketserver.TCPServer(("", p), GitDigestHandler) as httpd:
                print(f"\n=======================================================")
                print(f"🚀 GitDigest iniciado com sucesso!")
                print(f"📍 Acesse no navegador: http://localhost:{p}")
                print(f"📁 Diretório: {DIRECTORY}")
                print(f"💡 Pressione Ctrl+C para encerrar o servidor.")
                print(f"=======================================================\n")
                sys.stdout.flush()
                httpd.serve_forever()
        except OSError as e:
            if "Address already in use" in str(e):
                continue
            else:
                raise e

if __name__ == '__main__':
    run_server()
