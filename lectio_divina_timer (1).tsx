import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let app = null;
let auth = null;
let db = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'lectio-divina-timer';

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const cfg = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    if (cfg && Object.keys(cfg).length > 0) {
      app = getApps().length === 0 ? initializeApp(cfg) : getApps()[0];
      auth = getAuth(app);
      db = getFirestore(app);
    }
  }
} catch (err) {
  console.warn("Firebase init skipped:", err);
}

const STAGES = [
  { id: 'statio', name: 'Statio', description: 'Settle into the cell of your heart.' },
  { id: 'lectio', name: 'Lectio', description: 'Read the Word slowly and attentively.' },
  { id: 'meditatio', name: 'Meditatio', description: 'Reflect on what touches your soul.' },
  { id: 'oratio', name: 'Oratio', description: 'Respond to God in your own words.' },
  { id: 'contemplatio', name: 'Contemplatio', description: 'Rest in God\'s presence beyond words.' }
];

const IconSettings = ({ size = 22 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
const IconPen = ({ size = 22 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>);
const IconEdit = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const IconTrash = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>);
const IconRotate = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const IconChevron = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>);
const IconX = ({ size = 24 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);
const IconPlay = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>);
const IconPause = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>);
const IconBookOpen = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>);
const IconExternalLink = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>);

const fetchLectionaryFromGithub = async (setStatusMessage) => {
  try {
    setStatusMessage("Fetching Lectionary...");
    // Must use the raw.githubusercontent.com link to get the actual text data
    const rawUrl = "https://raw.githubusercontent.com/Lectio-Divina/Lectio-Divina/main/Daily_Gospel.txt";
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error("Failed to fetch from GitHub");
    const text = await response.text();

    const lines = text.trim().split('\n');
    
    // Get today's date in MM/DD/YYYY format matching the text file
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    const targetKey = `${mm}/${dd}/${yyyy}`;

    for (const line of lines) {
      const [datePart, ...rest] = line.split(':');
      if (datePart && datePart.trim() === targetKey) {
        setStatusMessage("Reading loaded.");
        return {
          reference: rest.join(':').trim(),
          dateFormatted: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          error: false
        };
      }
    }
    
    return { reference: "Reading Not Found", dateFormatted: now.toLocaleDateString(), error: true };
  } catch (err) {
    console.warn("Github fetch error:", err);
    return { reference: "Network Error", dateFormatted: new Date().toLocaleDateString(), error: true, message: "Could not retrieve the reading list." };
  }
};

const App = () => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [durations, setDurations] = useState({
    statio: 2,
    lectio: 2,
    meditatio: 2,
    oratio: 2,
    contemplatio: 2
  });
  
  const [timeLeft, setTimeLeft] = useState(120); 
  const [isActive, setIsActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedText, setExportedText] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [todayReading, setTodayReading] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");

  const [journalEntries, setJournalEntries] = useState([]);
  const [newEntryText, setNewEntryText] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const stepLock = useRef(false);
  const wakeLockRef = useRef(null);

  const currentStage = STAGES[currentStageIndex];
  const totalDuration = durations[currentStage.id] * 60;
  const progress = (timeLeft / totalDuration);

  useEffect(() => {
    const metas = [
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'theme-color', content: darkMode ? '#1C1A19' : '#FDFCFB' }
    ];

    metas.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    });

    const iconSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' fill='${darkMode ? '#1C1A19' : '#FDFCFB'}'/><text x='96' y='96' font-family='serif' font-size='80' fill='${darkMode ? '#FDFCFB' : '#1C1A19'}' text-anchor='middle' dominant-baseline='central'>LD</text></svg>`;
    const iconDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg);

    const manifest = {
      name: "Lectio Divina Timer",
      short_name: "Lectio",
      start_url: ".",
      display: "standalone",
      background_color: darkMode ? "#1C1A19" : "#FDFCFB",
      theme_color: darkMode ? "#1C1A19" : "#FDFCFB",
      icons: [{ src: iconDataUri, sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" }]
    };
    
    const manifestUrl = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestUrl;

  }, [darkMode]);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && wakeLockRef.current === null) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn("Wake lock denied:", err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current !== null) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.warn("Wake lock release failed:", err);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isActive, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, requestWakeLock]);

  useEffect(() => {
    if (!auth) {
      setUser({ uid: 'local-fallback-user' });
      return;
    }
    let isSubscribed = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        if (isSubscribed) setUser({ uid: 'local-fallback-user' });
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      if (isSubscribed) setUser(u ? { uid: u.uid } : { uid: 'local-fallback-user' });
    });
    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    const activeUser = user || { uid: 'local-fallback-user' };
    let isMounted = true;

    const syncData = async () => {
      try {
        if (db) {
          const settingsRef = doc(db, 'artifacts', appId, 'users', activeUser.uid, 'settings', 'timerDurations');
          const snap = await getDoc(settingsRef).catch(() => null);
          if (snap && snap.exists() && isMounted) {
            const data = snap.data();
            if (data.durations) {
              setDurations(data.durations);
              if (!isActive) setTimeLeft(data.durations[STAGES[currentStageIndex].id] * 60);
            }
            if (typeof data.darkMode === 'boolean') {
              setDarkMode(data.darkMode);
            }
          }
        }

        const readingResult = await fetchLectionaryFromGithub((msg) => {
          if (isMounted) setLoadingStatus(msg);
        });

        if (isMounted) {
          setTodayReading(readingResult);
        }

      } catch (e) {
        console.warn("Data sync warning:", e);
      }
    };

    syncData();

    let unsubscribeJournal = () => {};
    if (db) {
      try {
        const journalColRef = collection(db, 'artifacts', appId, 'users', activeUser.uid, 'journalEntries');
        unsubscribeJournal = onSnapshot(journalColRef, (snapshot) => {
          if (!isMounted) return;
          const entries = [];
          snapshot.forEach((docSnap) => {
            entries.push({ id: docSnap.id, ...docSnap.data() });
          });
          entries.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          setJournalEntries(entries);
        }, (error) => {
          console.warn("Journal snapshot fallback:", error);
        });
      } catch (err) {
        console.warn("Journal setup warning:", err);
      }
    }

    return () => {
      isMounted = false;
      unsubscribeJournal();
    };
  }, [user?.uid]);

  const saveSettings = async () => {
    setShowSettings(false);
    const activeUser = user || { uid: 'local-fallback-user' };
    setIsSaving(true);
    try {
      if (db) {
        const ref = doc(db, 'artifacts', appId, 'users', activeUser.uid, 'settings', 'timerDurations');
        await setDoc(ref, { durations, darkMode }, { merge: true });
      }
    } catch (e) {
      console.warn("Cloud save warning:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveJournalEntry = async () => {
    if (!newEntryText.trim()) return;
    const activeUser = user || { uid: 'local-fallback-user' };
    setIsSavingEntry(true);
    try {
      const newEntry = {
        date: todayReading?.dateFormatted || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        reference: todayReading?.reference || "Journal Entry",
        text: newEntryText.trim(),
        createdAt: serverTimestamp ? serverTimestamp() : { toMillis: () => Date.now() }
      };

      if (db) {
        const colRef = collection(db, 'artifacts', appId, 'users', activeUser.uid, 'journalEntries');
        await addDoc(colRef, newEntry);
      }
      setNewEntryText('');
    } catch (e) {
      console.error("Error saving entry:", e);
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleUpdateEntry = async (id) => {
    if (!editText.trim()) return;
    const activeUser = user || { uid: 'local-fallback-user' };
    try {
      if (db) {
        const docRef = doc(db, 'artifacts', appId, 'users', activeUser.uid, 'journalEntries', id);
        await updateDoc(docRef, { text: editText.trim() });
      }
      setEditingId(null);
      setEditText('');
    } catch (e) {
      console.error("Error updating entry:", e);
    }
  };

  const handleDeleteEntry = async (id) => {
    const activeUser = user || { uid: 'local-fallback-user' };
    try {
      if (db) {
        const docRef = doc(db, 'artifacts', appId, 'users', activeUser.uid, 'journalEntries', id);
        await deleteDoc(docRef);
      }
    } catch (e) {
      console.error("Error deleting entry:", e);
    }
  };

  const generateExportText = () => {
    if (journalEntries.length === 0) return "";
    let content = "=== LECTIO DIVINA JOURNAL LOG ===\n\n";
    journalEntries.forEach((entry, idx) => {
      content += `[Entry ${journalEntries.length - idx}] Date: ${entry.date}\n`;
      content += `Reading: ${entry.reference}\n`;
      content += `Reflection:\n${entry.text}\n`;
      content += `--------------------------------------------------\n\n`;
    });
    return content;
  };

  const handleOpenExport = () => {
    const text = generateExportText();
    setExportedText(text);
    setCopyStatus(false);
    setShowExportModal(true);
  };

  const handleCopyExport = () => {
    document.execCommand('copy');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(exportedText).catch(() => {});
    }
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 3000);
  };

  const playBell = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const now = ctx.currentTime;
      const fundamental = 220;
      const bellPartials = [
        { ratio: 0.5, gain: 0.4, decay: 5, detune: 0 },
        { ratio: 1.0, gain: 0.3, decay: 4, detune: 1 },
        { ratio: 1.19, gain: 0.2, decay: 3, detune: -1 },
        { ratio: 1.51, gain: 0.15, decay: 2.5, detune: 2 },
        { ratio: 2.0, gain: 0.1, decay: 2, detune: 0 },
        { ratio: 3.0, gain: 0.05, decay: 1.5, detune: 3 },
        { ratio: 4.2, gain: 0.03, decay: 1, detune: -2 }
      ];

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, now);
      masterGain.connect(ctx.destination);

      bellPartials.forEach((p) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * p.ratio, now);
        osc.detune.setValueAtTime(p.detune, now);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(p.gain, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + p.decay + 1);
      });
    } catch (e) { console.warn("Audio failed"); }
  }, []);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  useEffect(() => {
    if (timeLeft === 0 && isActive && !stepLock.current) {
      stepLock.current = true;
      playBell();
      const nextIndex = currentStageIndex + 1;
      if (nextIndex < STAGES.length) {
        setCurrentStageIndex(nextIndex);
        setTimeLeft(durations[STAGES[nextIndex].id] * 60);
        setTimeout(() => { stepLock.current = false; }, 1000);
      } else {
        setIsActive(false);
        stepLock.current = false;
      }
    }
  }, [timeLeft, isActive, currentStageIndex, durations, playBell]);

  const toggleTimer = () => {
    if (!isActive && audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    stepLock.current = false;
    clearInterval(timerRef.current);
    setCurrentStageIndex(0);
    setTimeLeft(durations[STAGES[0].id] * 60); 
  };

  const handleSkip = () => {
    if (stepLock.current) return;
    playBell();
    const nextIndex = (currentStageIndex + 1) % STAGES.length;
    setCurrentStageIndex(nextIndex);
    setTimeLeft(durations[STAGES[nextIndex].id] * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`h-screen font-sans flex flex-col items-center px-6 py-4 max-w-md mx-auto overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#1C1A19] text-stone-200' : 'bg-[#FDFCFB] text-stone-700'}`}>
      <header className="w-full flex justify-between items-center h-12 flex-shrink-0">
        <div className="flex items-center gap-1 w-10">
          <button onClick={() => setShowJournal(true)} title="Journal" className={`p-2 transition-colors relative ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-400 hover:text-stone-600'}`}>
            <IconPen size={20} />
            {journalEntries.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-600 rounded-full" />
            )}
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <h1 className={`text-[10px] font-serif tracking-[0.4em] uppercase ${darkMode ? 'text-stone-500' : 'text-stone-300'}`}>
            Lectio Divina
          </h1>
          
          <a 
            href="https://bible.usccb.org/daily-bible-reading"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md transition-opacity hover:opacity-70 ${darkMode ? 'text-stone-300 bg-stone-800' : 'text-stone-500 bg-stone-100'}`}
          >
            <span className="text-[10px] tracking-widest font-medium">
              {todayReading ? (todayReading.error ? "Reading Error" : todayReading.reference) : loadingStatus}
            </span>
            <IconExternalLink size={10} />
          </a>
        </div>

        <div className="w-10 flex justify-end">
          <button onClick={() => setShowSettings(true)} title="Settings" className={`p-2 transition-colors ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-400 hover:text-stone-600'}`}>
            <IconSettings size={22} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-around py-6">
        <div className="text-center h-20 flex flex-col justify-center">
          <h2 className={`text-2xl font-serif tracking-tight ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}>{currentStage.name}</h2>
          <p className={`text-[11px] italic px-8 leading-tight mt-1 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>
            {currentStage.description}
          </p>
        </div>

        <div 
          onClick={toggleTimer}
          className="relative w-64 h-64 flex-shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-300"
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="128" cy="128" r="122" stroke={darkMode ? "#292524" : "#F5F3F0"} strokeWidth="2.5" fill="transparent" />
            <circle
              cx="128" cy="128" r="122" stroke={darkMode ? "#78716c" : "#D6D3D1"} strokeWidth="2.5" fill="transparent"
              strokeDasharray={766} strokeDashoffset={766 * (1 - progress)}
              strokeLinecap="round" className="transition-all duration-1000 ease-linear"
            />
          </svg>
          
          <div className="flex flex-col items-center select-none">
            <span className={`text-6xl font-extralight tracking-tighter mb-2 ${darkMode ? 'text-stone-100' : 'text-stone-600'}`}>
              {formatTime(timeLeft)}
            </span>
            <div className={darkMode ? 'text-stone-500' : 'text-stone-200'}>
              {isActive ? <IconPause size={18} /> : <IconPlay size={18} />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-16 h-14 flex-shrink-0">
          <button onClick={handleReset} className={`flex flex-col items-center gap-1 transition-colors ${darkMode ? 'text-stone-500 hover:text-stone-300' : 'text-stone-300 active:text-stone-500'}`}>
            <IconRotate size={18} />
            <span className="text-[9px] uppercase tracking-[0.2em] mt-1">Reset</span>
          </button>
          <button onClick={handleSkip} className={`flex flex-col items-center gap-1 transition-colors ${darkMode ? 'text-stone-500 hover:text-stone-300' : 'text-stone-300 active:text-stone-500'}`}>
            <IconChevron size={18} />
            <span className="text-[9px] uppercase tracking-[0.2em] mt-1">Skip</span>
          </button>
        </div>
      </main>

      <footer className="h-10 flex items-center gap-3 flex-shrink-0">
        {STAGES.map((_, i) => (
          <div 
            key={i} 
            className={`h-1 rounded-full transition-all duration-700 ${
              i === currentStageIndex 
                ? (darkMode ? 'w-8 bg-stone-300' : 'w-8 bg-stone-400') 
                : (darkMode ? 'w-1.5 bg-stone-800' : 'w-1.5 bg-stone-200')
            }`} 
          />
        ))}
      </footer>

      {}
      {showJournal && (
        <div className={`fixed inset-0 z-50 p-6 flex flex-col animate-in slide-in-from-left duration-300 ${darkMode ? 'bg-[#1C1A19] text-stone-200' : 'bg-[#FDFCFB] text-stone-700'}`}>
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div>
              <h2 className={`text-xl font-serif ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}>Prayer Journal</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mt-0.5">Reflect on the Word</p>
            </div>
            <div className="flex items-center gap-2">
              {journalEntries.length > 0 && (
                <button 
                  onClick={handleOpenExport}
                  className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-opacity ${darkMode ? 'border-stone-700 text-stone-300 hover:bg-stone-800' : 'border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                >
                  Export All
                </button>
              )}
              <button onClick={() => setShowJournal(false)} className="p-2 opacity-60 hover:opacity-100"><IconX size={22} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-[#262423] border-stone-800' : 'bg-white border-stone-100 shadow-sm'}`}>
              <p className={`text-[10px] uppercase tracking-[0.2em] mb-2 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>New Entry • {todayReading?.reference || "Today's Gospel"}</p>
              <textarea 
                rows="3"
                value={newEntryText}
                onChange={(e) => setNewEntryText(e.target.value)}
                placeholder="Write your meditation, conversation with God, or insights..."
                className={`w-full p-3 rounded-lg text-sm font-serif resize-none focus:outline-none border transition-colors ${darkMode ? 'bg-[#1C1A19] border-stone-700 text-stone-200 focus:border-stone-500' : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-stone-400'}`}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveJournalEntry}
                  disabled={isSavingEntry || !newEntryText.trim()}
                  className={`text-xs uppercase tracking-widest px-5 py-2 rounded-full font-medium transition-opacity disabled:opacity-40 ${darkMode ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-white'}`}
                >
                  {isSavingEntry ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-medium">Past Reflections ({journalEntries.length})</h3>
              {journalEntries.length === 0 ? (
                <p className="text-xs italic opacity-40 text-center py-8">No journal entries saved yet.</p>
              ) : (
                journalEntries.map(entry => (
                  <div key={entry.id} className={`p-4 rounded-xl border space-y-2 ${darkMode ? 'bg-[#262423] border-stone-800' : 'bg-white border-stone-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] opacity-50">
                      <span>{entry.date}</span>
                      <div className="flex items-center gap-2">
                        <span>{entry.reference}</span>
                        {editingId !== entry.id && (
                          <>
                            <button 
                              onClick={() => { setEditingId(entry.id); setEditText(entry.text); }}
                              title="Edit entry" 
                              className="p-1 opacity-60 hover:opacity-100 transition-opacity"
                            >
                              <IconEdit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteEntry(entry.id)}
                              title="Delete entry" 
                              className="p-1 opacity-60 hover:text-red-500 transition-colors"
                            >
                              <IconTrash size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingId === entry.id ? (
                      <div className="space-y-2 mt-2">
                        <textarea 
                          rows="3"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className={`w-full p-2.5 rounded-lg text-sm font-serif resize-none focus:outline-none border ${darkMode ? 'bg-[#1C1A19] border-stone-700 text-stone-200' : 'bg-stone-50 border-stone-200 text-stone-800'}`}
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setEditingId(null)}
                            className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border ${darkMode ? 'border-stone-700 text-stone-400' : 'border-stone-300 text-stone-600'}`}
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleUpdateEntry(entry.id)}
                            className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-medium ${darkMode ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-white'}`}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm font-serif whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                        {entry.text}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl flex flex-col max-h-[80vh] ${darkMode ? 'bg-[#262423] border-stone-700 text-stone-200' : 'bg-white border-stone-200 text-stone-800'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif">Export Journal Log</h3>
              <button onClick={() => setShowExportModal(false)} className="p-1 opacity-60 hover:opacity-100"><IconX size={20} /></button>
            </div>
            <p className="text-xs opacity-60 mb-3">Copy your complete prayer journal history below:</p>
            <textarea
              readOnly
              value={exportedText}
              rows="10"
              className={`w-full p-3 rounded-xl text-xs font-mono resize-none border focus:outline-none mb-4 ${darkMode ? 'bg-[#1C1A19] border-stone-700 text-stone-300' : 'bg-stone-50 border-stone-200 text-stone-700'}`}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className={`text-[10px] uppercase tracking-widest px-4 py-2 rounded-full border ${darkMode ? 'border-stone-700 text-stone-400' : 'border-stone-300 text-stone-600'}`}
              >
                Close
              </button>
              <button
                onClick={handleCopyExport}
                className={`text-[10px] uppercase tracking-widest px-5 py-2 rounded-full font-medium ${darkMode ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-white'}`}
              >
                {copyStatus ? 'Copied to Clipboard!' : 'Copy All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className={`fixed inset-0 z-50 p-8 flex flex-col animate-in slide-in-from-bottom duration-300 ${darkMode ? 'bg-[#262423] text-stone-100' : 'bg-stone-50 text-stone-800'}`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-serif">Preferences</h2>
            <button 
              onClick={saveSettings} 
              disabled={isSaving}
              className={`text-xs uppercase tracking-widest px-5 py-2 rounded-full border shadow-sm transition-opacity disabled:opacity-50 ${darkMode ? 'bg-[#1C1A19] border-stone-700 text-stone-300' : 'bg-white border-stone-100 text-stone-500'}`}
            >
              {isSaving ? 'Saving...' : 'Done'}
            </button>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            <div className={`flex items-center justify-between p-4 rounded-xl border ${darkMode ? 'bg-[#1C1A19] border-stone-800' : 'bg-white border-stone-100'}`}>
              <span className="text-xs uppercase tracking-[0.2em] font-medium">Dark Mode</span>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${darkMode ? 'bg-stone-600 justify-end' : 'bg-stone-300 justify-start'}`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>

            <div className="space-y-6 pt-2">
              <h3 className="text-xs uppercase tracking-[0.2em] opacity-60 font-medium">Timer Durations</h3>
              
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-stone-800/50 border-stone-700' : 'bg-stone-100/50 border-stone-200'}`}>
                <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] opacity-70 mb-3">
                  <span className={`font-semibold ${darkMode ? 'text-stone-300' : 'text-stone-800'}`}>Sync All Stages</span>
                  <span className={`font-semibold ${darkMode ? 'text-stone-300' : 'text-stone-800'}`}>{durations.statio} min</span>
                </div>
                <input 
                  type="range" min="1" max="30"
                  value={durations.statio}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setDurations({ statio: val, lectio: val, meditatio: val, oratio: val, contemplatio: val });
                    if (!isActive) setTimeLeft(val * 60);
                  }}
                  className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${darkMode ? 'bg-stone-500 accent-stone-200' : 'bg-stone-300 accent-stone-700'}`}
                />
              </div>

              <div className="space-y-4 pt-2">
                {STAGES.map(stage => (
                  <div key={stage.id} className="space-y-2">
                    <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] opacity-70">
                      <span>{stage.name}</span>
                      <span className="font-semibold">{durations[stage.id]} min</span>
                    </div>
                    <input 
                      type="range" min="1" max="30"
                      value={durations[stage.id]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setDurations(prev => ({ ...prev, [stage.id]: val }));
                        if (stage.id === currentStage.id && !isActive) setTimeLeft(val * 60);
                      }}
                      className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${darkMode ? 'bg-stone-700 accent-stone-400' : 'bg-stone-200 accent-stone-400'}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;