import os
import urllib.parse
import urllib.request
import re
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def detect_script_lang(text):
    """Detects Indian regional script from Unicode ranges."""
    if re.search(r'[\u0900-\u097F]', text):
        return 'hi' # Devanagari (Hindi, Marathi)
    if re.search(r'[\u0B80-\u0BFF]', text):
        return 'ta' # Tamil
    if re.search(r'[\u0C00-\u0C7F]', text):
        return 'te' # Telugu
    if re.search(r'[\u0980-\u09FF]', text):
        return 'bn' # Bengali
    if re.search(r'[\u0C80-\u0CFF]', text):
        return 'kn' # Kannada
    if re.search(r'[\u0D00-\u0D7F]', text):
        return 'ml' # Malayalam
    if re.search(r'[\u0A80-\u0AFF]', text):
        return 'gu' # Gujarati
    if re.search(r'[\u0A00-\u0A7F]', text):
        return 'pa' # Punjabi
    return 'hi' # Default to Hindi for Indian gig workers

class SahayakServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def handle_tts(self, is_head=False):
        parsed_url = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        text = query_params.get('q', [''])[0].strip()
        lang = query_params.get('tl', [''])[0].strip()

        if not text:
            self.send_error(400, "Missing 'q' query parameter")
            return

        if not lang or lang == 'auto':
            lang = detect_script_lang(text)

        # Limit single chunk to 200 chars for Google TTS
        text = text[:200]

        try:
            encoded_q = urllib.parse.quote(text)
            tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={lang}&client=tw-ob&q={encoded_q}"
            
            req = urllib.request.Request(tts_url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://translate.google.com/'
            })
            
            with urllib.request.urlopen(req, timeout=6) as response:
                audio_data = response.read()

            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(len(audio_data)))
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            if not is_head:
                self.wfile.write(audio_data)

        except Exception as e:
            print(f"[TTS Error] {e}")
            self.send_error(502, f"TTS service unavailable: {e}")

    def do_GET(self):
        if self.path.startswith('/tts'):
            self.handle_tts(is_head=False)
            return
        super().do_GET()

    def do_HEAD(self):
        if self.path.startswith('/tts'):
            self.handle_tts(is_head=True)
            return
        super().do_HEAD()

if __name__ == '__main__':
    print(f"Starting SahayakAI Server with Multilingual TTS at http://localhost:{PORT}")
    server = HTTPServer(('0.0.0.0', PORT), SahayakServerHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()
