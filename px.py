import struct, datetime
def _cs(b):
    return b.split(b'\0',1)[0]
class Table:
    def __init__(s, path, enc=None):
        s.path=path; d=s.d=open(path,'rb').read()
        u16=lambda o:struct.unpack_from('<H',d,o)[0]; u32=lambda o:struct.unpack_from('<I',d,o)[0]
        s.recsize=u16(0); s.hsize=u16(2); s.ftype=d[4]; s.blk=d[5]*1024
        s.nrec=u32(6); s.first=u16(0xE); s.nfields=u16(0x21); s.pk=u16(0x23)
        s.ver=d[0x39]; s.cp=u16(0x6A) if len(d)>0x6C else 0
        s.enc=enc or ('cp%d'%s.cp if s.cp else 'cp866')
        fo=0x78; s.types=[(d[fo+2*i],d[fo+2*i+1]) for i in range(s.nfields)]
        p=fo+2*s.nfields+4+4*s.nfields
        strs=[]; q=p
        while q<s.hsize and len(strs)<s.nfields+1:
            e=d.index(b'\0',q)
            if e>q: strs.append(d[q:e]); 
            q=e+1
        s.tname=strs[0].decode('latin1') if strs else ''
        s.names=[x.decode(s.enc,'replace') for x in strs[1:s.nfields+1]]
        if len(s.names)<s.nfields: s.names+= ['f%d'%i for i in range(len(s.names),s.nfields)]
    def fval(s,t,sz,b):
        if t==1: return _cs(b).decode(s.enc,'replace').strip()
        if t==2:
            v=struct.unpack('>I',b)[0]^0x80000000 if b[0]&0x80 else None
            if v is None or b==b'\0'*4: return None
            try: return (datetime.date(1,1,1)+datetime.timedelta(days=v-1)).isoformat()
            except Exception: return None
        if t==3:
            if b==b'\0'*2: return None
            return struct.unpack('>h',bytes([b[0]^0x80,b[1]]))[0]
        if t in (4,0x16):
            if b==b'\0'*4: return None
            return struct.unpack('>i',bytes([b[0]^0x80])+b[1:])[0]
        if t in (5,6):
            if b==b'\0'*8: return None
            if b[0]&0x80: x=bytes([b[0]&0x7f])+b[1:]
            else: x=bytes(255-c for c in b)
            return struct.unpack('>d',x)[0]
        if t==9: return None if b==b'\0' else bool(b[0]&0x80)
        if t==0xA:
            v=struct.unpack('>I',b)[0]^0x80000000 if b[0]&0x80 else None
            return v
        if t==0x15:
            if b==b'\0'*8: return None
            x=bytes([b[0]&0x7f])+b[1:] if b[0]&0x80 else bytes(255-c for c in b)
            return struct.unpack('>d',x)[0]
        return b.hex()
    def rows(s):
        d=s.d; blk=s.first; seen=set()
        while blk and blk not in seen and s.nrec:
            seen.add(blk); o=s.hsize+(blk-1)*s.blk
            if o+6>len(d): break
            nxt,prv,add=struct.unpack_from('<HHh',d,o)
            n=add//s.recsize+1 if add>=0 else 0
            for i in range(n):
                r=d[o+6+i*s.recsize:o+6+(i+1)*s.recsize]
                if len(r)<s.recsize: break
                out=[]; p=0
                for t,sz in s.types:
                    out.append(s.fval(t,sz,r[p:p+sz])); p+=sz
                yield out
            blk=nxt
