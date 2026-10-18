package com.nthexperience.footprints;

import java.util.*;

/** Source-independent achievements: retain each day's best observation exactly once. */
public final class StepTally {
    public final Map<String,Long> days=new LinkedHashMap<>();
    public final Map<String,Long> targets=new LinkedHashMap<>();
    public final Set<String> goals=new HashSet<>();
    public void observe(String day,long value,long goal){
        if(day==null||!day.matches("\\d{4}-\\d{2}-\\d{2}")||value<0||value>1000000||goal<100||goal>100000)return;
        days.put(day,Math.max(days.getOrDefault(day,0L),value));
        if(value>0){targets.putIfAbsent(day,goal);if(value>=targets.get(day))goals.add(day);}
    }
    public long total(){long n=0;for(long day:days.values())n=Math.addExact(n,day);return n;}
    public long best(){long n=0;for(long day:days.values())n=Math.max(n,day);return n;}
    public long active(){long n=0;for(long day:days.values())if(day>=1000)n++;return n;}
}
