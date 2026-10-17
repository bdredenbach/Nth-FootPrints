package com.nthexperience.footprints;
import java.io.*;
import java.security.*;
import java.util.function.BooleanSupplier;
/** Shared native 64-bit accounting and bounded read-back verification. */
final class BackupIO {
    static final long MAX_SAFE_BYTES=9007199254740991L;
    static MessageDigest digest(){try{return MessageDigest.getInstance("SHA-256");}catch(Exception e){throw new IllegalStateException(e);}}
    static long add(long written,int count,long expected)throws IOException{if(written<0||count<1||expected<1||expected>MAX_SAFE_BYTES||written>expected-count)throw new IOException("Invalid export length");return written+count;}
    static long verify(InputStream input,byte[] expected,BooleanSupplier cancelled)throws IOException{
        if(input==null)throw new IOException("The saved backup could not be reopened for verification.");
        MessageDigest digest=digest();long bytes=0;byte[] block=new byte[65536];
        try(InputStream in=input){int n;while((n=in.read(block))!=-1){if(cancelled.getAsBoolean())throw new IOException("Export cancelled.");if(n==0){int one=in.read();if(one<0)break;digest.update((byte)one);bytes++;}else{digest.update(block,0,n);bytes+=n;}}}
        if(cancelled.getAsBoolean())throw new IOException("Export cancelled.");
        if(!MessageDigest.isEqual(expected,digest.digest()))throw new IOException("Saved backup verification failed.");return bytes;
    }
}
