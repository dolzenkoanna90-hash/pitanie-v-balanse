const shapes={
 chart:'<path d="M4 20h16M6 16v-4m6 4V7m6 9V4"/>',
 heart:'<path d="M20.8 8.7c0 4.5-8.8 9.5-8.8 9.5S3.2 13.2 3.2 8.7a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3Z"/>',
 clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
 scale:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 11a4 4 0 0 1 8 0m-4 0 2-2"/>',
 home:'<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>',
 menu:'<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M18 3c-2 2-3 5-3 9h4m0-9v18"/>',
 journal:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7h4M3 12h4M3 17h4m3-9h6m-6 4h6m-6 4h4"/>',
 water:'<path d="M12 3c2.5 4 6.5 7.6 6.5 12a6.5 6.5 0 1 1-13 0C5.5 10.6 9.5 7 12 3Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
 user:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20v-1a6.5 5 0 0 1 13 0v1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 left:'<path d="m14 6-6 6 6 6"/>', right:'<path d="m10 6 6 6-6 6"/>',
 spark:'<path d="M12 2v7m0 6v7M2 12h7m6 0h7M5 5l4 4m6 6 4 4m0-14-4 4m-6 6-4 4"/>',
 flame:'<path d="M12 22a7 7 0 0 0 7-7c0-3-2-5-4-6 0 3-1 4-2 4 0-4-1-7-4-10 0 4-1 6-3 9-2 4 .3 10 6 10Z"/>',
 camera:'<path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 check:'<path d="m5 12 4 4L19 6"/>', trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
 edit:'<path d="M4 16v4h4l11-11-4-4L4 16Zm9-9 4 4"/>',
 refresh:'<path d="M20 8a8 8 0 1 0 0 8m0-12v4h-4"/>', lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
 book:'<path d="M3 5a9 9 0 0 1 9 2 9 9 0 0 1 9-2v14a9 9 0 0 0-9 2 9 9 0 0 0-9-2ZM12 7v14"/>'
};
export const icon=(name,size=20)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name]||'')+'</svg>';
