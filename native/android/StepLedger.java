package com.nthexperience.footprints;

import java.util.LinkedHashMap;
import java.util.Map;

/** Hardware counter deltas only. Paused periods and counter resets never create steps. */
public final class StepLedger {
    public long raw=-1, boot=-1, elapsed=-1, total=0;
    public final Map<String,Long> days=new LinkedHashMap<>();
    public long accept(long value,String day,long bootId,long eventElapsed){
        if(value<0||day==null||!day.matches("\\d{4}-\\d{2}-\\d{2}")||eventElapsed<0)throw new IllegalArgumentException("Invalid step reading");
        if(boot==bootId&&elapsed>=0&&eventElapsed<elapsed)return 0; // delayed/out-of-order sample
        long delta=raw<0||boot!=bootId||value<raw?0:value-raw;
        raw=value;boot=bootId;elapsed=eventElapsed;
        total=Math.addExact(total,delta);days.put(day,Math.addExact(days.getOrDefault(day,0L),delta));return delta;
    }
    public void rebase(){raw=-1;elapsed=-1;}
    public long today(String date){return days.getOrDefault(date,0L);}
}
