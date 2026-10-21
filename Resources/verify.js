(function(root) {
  function languageKey(tag) {
    try { return new Intl.Locale(tag).maximize().toString().toLowerCase(); }
    catch(_) { return String(tag).toLowerCase(); }
  }
  function canonicalZone(zone) {
    try { return new Intl.DateTimeFormat('en',{timeZone:zone}).resolvedOptions().timeZone; }
    catch(_) { return zone; }
  }
  function offsetFor(zone, now) {
    // shortOffset accounts for daylight saving time on the current date.
    try {
      var text=new Intl.DateTimeFormat('en',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(now).filter(function(p){return p.type==='timeZoneName';})[0].value;
      if(text==='GMT' || text==='UTC') return 0;
      var m=text.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?/);
      if(m) return (m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3]||0));
    } catch(_) {}
    return null;
  }
  function classifyBrowser(data, profiles) {
    var now=new Date();
    return (profiles||root.regionProfiles||[]).filter(function(p) {
      var zoneMatches=canonicalZone(data.timeZone)===canonicalZone(p.timeZone);
      // Some Safari releases render Etc/GMT-8 as GMT+08:00.
      if(p.timeZone==='Etc/GMT-8' && ['GMT+08:00','+08:00'].indexOf(data.timeZone)>=0) zoneMatches=true;
      return zoneMatches && data.offsetMinutes===offsetFor(p.timeZone,now) &&
        languageKey(data.locale)===languageKey(p.locale) &&
        languageKey(data.language)===languageKey(p.language) &&
        languageKey((data.languages||[])[0])===languageKey(p.language);
    })[0] || null;
  }
  root.classifyBrowser=classifyBrowser;
})(typeof globalThis!=='undefined'?globalThis:this);
