#!/usr/bin/env python3
"""Create rescue backup parts inside the OLD debug APK. Never install/uninstall or edit its database.
Works in Termux after wireless ADB pairing, or on a computer with USB ADB.
"""
import argparse, base64, hashlib, json, os, re, shutil, socket, struct, subprocess, sys
from urllib.parse import urlparse
from urllib.request import urlopen
PACKAGE='com.nthexperience.footprints'
MODULE='https://bdredenbach.github.io/Nth-FootPrints/dist/rescue-legacy.js?v=0.7.0'

class WebSocket:
    def __init__(self,url):
        u=urlparse(url)
        if u.scheme!='ws' or u.hostname not in ('127.0.0.1','localhost'):
            raise RuntimeError('Only a local debugging socket is accepted.')
        self.sock=socket.create_connection((u.hostname,u.port),timeout=30)
        self.sock.settimeout(3600)
        key=base64.b64encode(os.urandom(16)).decode()
        request=f'GET {u.path or "/"} HTTP/1.1\r\nHost: {u.hostname}:{u.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
        self.sock.sendall(request.encode('ascii'));self.buffer=b''
        while b'\r\n\r\n' not in self.buffer:
            chunk=self.sock.recv(4096)
            if not chunk:raise RuntimeError('The debugging connection closed during setup.')
            self.buffer+=chunk
            if len(self.buffer)>16384:raise RuntimeError('Invalid debugging handshake.')
        headers,self.buffer=self.buffer.split(b'\r\n\r\n',1)
        expected=base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        fields={line.split(':',1)[0].strip().lower():line.split(':',1)[1].strip() for line in headers.decode().split('\r\n')[1:] if ':' in line}
        if b' 101 ' not in headers.split(b'\r\n')[0] or fields.get('sec-websocket-accept')!=expected:
            raise RuntimeError('The debugging connection was not accepted.')
    def read(self,n):
        while len(self.buffer)<n:
            part=self.sock.recv(max(4096,n-len(self.buffer)))
            if not part:raise RuntimeError('The app debugging connection closed. The old journal was not changed.')
            self.buffer+=part
        result,self.buffer=self.buffer[:n],self.buffer[n:];return result
    def send(self,value,opcode=1):
        data=value if isinstance(value,bytes) else json.dumps(value).encode();mask=os.urandom(4);n=len(data)
        header=bytes([0x80|opcode,0x80|n]) if n<126 else bytes([0x80|opcode,0xfe])+struct.pack('!H',n) if n<65536 else bytes([0x80|opcode,0xff])+struct.pack('!Q',n)
        self.sock.sendall(header+mask+bytes(b^mask[i%4] for i,b in enumerate(data)))
    def receive(self):
        result=b''
        while True:
            h=self.read(2);opcode=h[0]&15;n=h[1]&127
            if n==126:n=struct.unpack('!H',self.read(2))[0]
            if n==127:n=struct.unpack('!Q',self.read(8))[0]
            if n>2*1024*1024:raise RuntimeError('Unexpectedly large debugging response.')
            mask=self.read(4) if h[1]&128 else None;data=self.read(n)
            if mask:data=bytes(b^mask[i%4] for i,b in enumerate(data))
            if opcode==8:raise RuntimeError('The app closed the debugging connection.')
            if opcode==9:self.send(data,10);continue
            if opcode==10:continue
            if opcode not in (0,1):raise RuntimeError('Unexpected debugging frame.')
            result+=data
            if len(result)>2*1024*1024:raise RuntimeError('Unexpectedly large debugging message.')
            if h[0]&128:return json.loads(result)
    def close(self):self.sock.close()

def run_rescue(endpoint,module=MODULE):
    u=urlparse(module)
    if not (u.scheme=='https' and u.hostname=='bdredenbach.github.io') and not (u.scheme=='http' and u.hostname in ('localhost','127.0.0.1')):
        raise RuntimeError('Unexpected rescue module origin.')
    with urlopen(endpoint.rstrip('/')+'/json/list',timeout=20) as response:
        targets=json.loads(response.read(1024*1024))
    matches=[t for t in targets if t.get('type')=='page' and urlparse(t.get('url','')).hostname in ('localhost','127.0.0.1') and 'webSocketDebuggerUrl' in t]
    if len(matches)!=1:raise RuntimeError('Open Nth FootPrints and close other app WebViews, then retry. No unique journal page was found.')
    ws=WebSocket(matches[0]['webSocketDebuggerUrl'])
    try:
        expression="(async()=>{if(!window.NthNative?.BackupFiles||!document.querySelector('#backup-open'))throw Error('Not the Nth FootPrints app.');return await (await import("+json.dumps(module)+")).rescueLegacyJournal();})()"
        ws.send({'id':1,'method':'Runtime.evaluate','params':{'expression':expression,'awaitPromise':True,'returnByValue':True}})
        print('Return to Nth FootPrints now. Rescue starts when it is visible; save EVERY numbered part in the same folder.',flush=True)
        print('Keep the phone unlocked and the old app installed. The journal itself is read-only.',flush=True)
        while True:
            answer=ws.receive()
            if answer.get('id')!=1:continue
            if answer.get('error'):raise RuntimeError(answer['error'].get('message','Debugging request failed.'))
            result=answer.get('result',{})
            if result.get('exceptionDetails'):
                detail=result['exceptionDetails'];raise RuntimeError(detail.get('exception',{}).get('description') or detail.get('text','Rescue failed.'))
            value=result.get('result',{}).get('value')
            if not isinstance(value,dict) or value.get('journalUnchanged') is not True:raise RuntimeError('No completed rescue was confirmed.')
            print(json.dumps(value,indent=2),flush=True)
            print('Next: restore ALL parts together in the updated WEBSITE and verify every footprint/photo before replacing the APK.',flush=True)
            return value
    finally:ws.close()

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--serial');p.add_argument('--debug-endpoint',help=argparse.SUPPRESS);p.add_argument('--module-url',default=MODULE,help=argparse.SUPPRESS);args=p.parse_args()
    if args.debug_endpoint:
        if urlparse(args.debug_endpoint).hostname not in ('127.0.0.1','localhost'):raise RuntimeError('Only a local debugging endpoint is accepted.')
        return run_rescue(args.debug_endpoint,args.module_url)
    adb=shutil.which('adb')
    if not adb:raise RuntimeError('ADB is not installed. In Termux run: pkg install android-tools python')
    def command(*words):
        r=subprocess.run([adb,*words],capture_output=True,text=True,timeout=30)
        if r.returncode:raise RuntimeError(r.stderr.strip() or r.stdout.strip() or 'ADB command failed.')
        return r.stdout.strip()
    devices=[line.split()[0] for line in command('devices').splitlines()[1:] if len(line.split())==2 and line.split()[1]=='device']
    serial=args.serial or (devices[0] if len(devices)==1 else None)
    if not serial or serial not in devices:raise RuntimeError('Pair/connect wireless debugging first. Exactly one connected device is required, or use --serial.')
    if not re.fullmatch(r'[A-Za-z0-9._:-]+',serial):raise RuntimeError('Invalid device identifier.')
    pid=command('-s',serial,'shell','pidof',PACKAGE).split()
    if len(pid)!=1 or not pid[0].isdigit():raise RuntimeError('Open the existing Nth FootPrints app, then retry.')
    port=command('-s',serial,'forward','tcp:0','localabstract:webview_devtools_remote_'+pid[0])
    if not port.isdigit():raise RuntimeError('The local debugging port was not created.')
    try:return run_rescue('http://127.0.0.1:'+port,args.module_url)
    finally:command('-s',serial,'forward','--remove','tcp:'+port)

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as error:
        print('Rescue not confirmed:',str(error),file=sys.stderr)
        print('Keep the old app installed. Do not delete its data; a failed rescue does not change it.',file=sys.stderr)
        sys.exit(1)
