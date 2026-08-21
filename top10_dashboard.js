document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const courseSelect = $("course"), eventSelect = $("event"), genderSelect = $("gender"), ageGroupSelect = $("age_group_desc");
  const form = $("filter-form"), resultsTable = $("results-table"), heading = $("club-heading"), logo = $("club-logo");
  const JSON_PATH = "Static/top10.json";
  let rows = [];

  const EVENT_ORDER = [
    "25 Free","50 Free","100 Free","200 Free","400 Free","500 Free","800 Free","1000 Free","1500 Free","1650 Free",
    "25 Back","50 Back","100 Back","200 Back","25 Breast","50 Breast","100 Breast","200 Breast",
    "25 Butterfly","50 Butterfly","100 Butterfly","200 Butterfly","100 IM","200 IM","400 IM",
    "100 Free Relay","200 Free Relay","400 Free Relay","800 Free Relay","200 Medley Relay","400 Medley Relay"
  ];
  const EVENT_LABELS = {"400 Free":"400/500 Free","500 Free":"400/500 Free","800 Free":"800/1000 Free","1000 Free":"800/1000 Free","1500 Free":"1500/1650 Free","1650 Free":"1500/1650 Free"};
  const GENDER_LABELS = {F:"Female",M:"Male",X:"Mixed"};
  const esc = v => String(v ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));

  function ageSortKey(label){ const s=String(label||"").trim(); if(s==="Open") return [999,9,s]; const single=s.match(/^Age\s+(\d+)$/i); if(single)return[+single[1],0,s]; const nums=s.match(/\d+/g); return [nums?+nums[0]:998,1,s]; }
  function compareAge(a,b){const x=ageSortKey(a),y=ageSortKey(b);return x[0]-y[0]||x[1]-y[1]||x[2].localeCompare(y[2]);}
  function eventSort(a,b){const ia=EVENT_ORDER.indexOf(a),ib=EVENT_ORDER.indexOf(b); if(ia!==-1||ib!==-1)return(ia===-1?999:ia)-(ib===-1?999:ib); return a.localeCompare(b);}
  function setStatus(msg){resultsTable.innerHTML=`<tr><td colspan="5" style="text-align:center;color:#666;padding:12px;">${esc(msg)}</td></tr>`;}
  function fillSelect(select, values, labels={}, preserve=true){const previous=preserve?select.value:""; select.innerHTML=values.map(v=>`<option value="${esc(v)}">${esc(labels[v]??v)}</option>`).join(""); if(previous&&values.includes(previous))select.value=previous;}

  function refreshControls(changed=""){
    const courses=[...new Set(rows.map(r=>r.course).filter(Boolean))].sort(); fillSelect(courseSelect,courses,{},changed!=="course");
    const gr=rows.filter(r=>!courseSelect.value||r.course===courseSelect.value); const genders=[...new Set(gr.map(r=>r.gender).filter(Boolean))].sort((a,b)=>["F","M","X"].indexOf(a)-["F","M","X"].indexOf(b)); fillSelect(genderSelect,genders,GENDER_LABELS,changed!=="gender");
    const ar=rows.filter(r=>(!courseSelect.value||r.course===courseSelect.value)&&(!genderSelect.value||r.gender===genderSelect.value)); const ages=[...new Set(ar.map(r=>r.age_group).filter(Boolean))].sort(compareAge); fillSelect(ageGroupSelect,ages,{},changed!=="age");
    const er=rows.filter(r=>(!courseSelect.value||r.course===courseSelect.value)&&(!genderSelect.value||r.gender===genderSelect.value)&&(!ageGroupSelect.value||r.age_group===ageGroupSelect.value)); const events=[...new Set(er.map(r=>r.event).filter(Boolean))].sort(eventSort); fillSelect(eventSelect,events,Object.fromEntries(events.map(e=>[e,EVENT_LABELS[e]||e])),changed!=="event");
  }

  function render(){
    const filtered=rows.filter(r=>r.course===courseSelect.value&&r.gender===genderSelect.value&&r.age_group===ageGroupSelect.value&&r.event===eventSelect.value).sort((a,b)=>(a.seconds??1e12)-(b.seconds??1e12)||(a.rank??999)-(b.rank??999)).slice(0,10);
    if(!filtered.length)return setStatus("No results found");
    resultsTable.innerHTML=filtered.map((r,i)=>`<tr><td data-label="Rank">${esc(r.rank??i+1)}</td><td data-label="Name">${esc(r.name)}</td><td data-label="Swim Time">${esc(r.time)}</td><td data-label="Date">${esc(r.date)}</td><td data-label="Meet">${esc(r.meet||"")}</td></tr>`).join("");
    requestAnimationFrame(()=>resultsTable.querySelectorAll("tr").forEach(tr=>tr.classList.add("show")));
  }

  fetch(JSON_PATH,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(data=>{
    rows=Array.isArray(data.records)?data.records:[]; const meta=data.meta||{};
    document.title=meta.page_title||document.title; if(heading)heading.textContent=meta.heading||meta.club_name||"ALL-TIME TOP 10 TIMES";
    if(logo&&meta.logo){logo.src=meta.logo;logo.alt=`${meta.club_name||"Club"} Logo`;logo.style.display="block";} else if(logo){logo.style.display="none";}
    if(!rows.length)return setStatus("No data available"); refreshControls(); render();
  }).catch(err=>{console.error(err);setStatus("Error loading data");});
  courseSelect.addEventListener("change",()=>{refreshControls("course");render();}); genderSelect.addEventListener("change",()=>{refreshControls("gender");render();}); ageGroupSelect.addEventListener("change",()=>{refreshControls("age");render();}); eventSelect.addEventListener("change",render); form.addEventListener("submit",e=>{e.preventDefault();render();});
});
