package com.nthexperience.footprints;
import java.io.*;
import java.util.zip.*;
public final class LargeBackupIOTest {
 public static void main(String[] args)throws Exception{
  File file=new File(args[0]);byte[] expected=new byte[32];for(int i=0;i<32;i++)expected[i]=(byte)Integer.parseInt(args[1].substring(i*2,i*2+2),16);
  long verified=BackupIO.verify(new FileInputStream(file),expected,()->false);if(verified<=2147483647L)throw new AssertionError("Fixture must exceed 2 GiB");
  long bytes=0,entries=0;byte[] block=new byte[65536];try(ZipInputStream in=new ZipInputStream(new FileInputStream(file))){while(in.getNextEntry()!=null){int n;while((n=in.read(block))!=-1)bytes+=n;entries++;}}
  if(bytes<=2147483647L||entries<100)throw new AssertionError("Native ZIP64 round trip incomplete");
  if(BackupIO.add(2147483640L,192*1024,4000000000L)<=2147483647L)throw new AssertionError("32-bit counter overflow");
  boolean cancelled=false;try{BackupIO.verify(new FileInputStream(file),expected,()->true);}catch(IOException e){cancelled=true;}if(!cancelled)throw new AssertionError("Cancellation ignored");
  System.out.println("PASS native ZIP64 read/CRC and SHA-256 verification: "+verified+" bytes, "+entries+" entries, 32 MiB Java heap");
 }
}
