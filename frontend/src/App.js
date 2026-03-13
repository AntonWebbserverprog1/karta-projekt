import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import './App.css';

const API_BASE = "";

function App() {
  // --- STATES ---
  // Lägg till dessa högst upp i din App-komponent
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [currentCampaign, setCurrentCampaign] = useState(null); // NULL betyder att vi är på Dashboarden
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [maps, setMaps] = useState([]);
  const [currentMap, setCurrentMap] = useState(null);
  const [markers, setMarkers] = useState([]); 
  const [allMarkers, setAllMarkers] = useState([]); 
  const [loreEntries, setLoreEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [selectedLore, setSelectedLore] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [hoverPreview, setHoverPreview] = useState({ visible: false, entry: null, x: 0, y: 0 });

  const [uploadMapData, setUploadMapData] = useState({ name: '', file: null });
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);
  const [tempMarkerPos, setTempMarkerPos] = useState({ x: 0, y: 0 });
  const [markerData, setMarkerData] = useState({ label: '', type: 'info', linkId: '' });
  const [loreForm, setLoreForm] = useState({ title: '', content: '', file: null });

  const [newCatName, setNewCatName] = useState('');
  const [showCatInput, setShowCatInput] = useState({ map: false, lore: false });

  // --- API ---
  const api = useMemo(() => {
    const instance = axios.create({ baseURL: `/api` });
    instance.interceptors.request.use(config => {
      const t = localStorage.getItem('token');
      if (t && t !== 'true' && t !== 'null') config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
    return instance;
  }, [token]);

  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); };

  const fetchCampaigns = async () => {
  try {
    const res = await api.get('/campaigns');
    setCampaigns(res.data || []);
  } catch (e) {
    console.error("Kunde inte hämta kampanjer", e);
  }
};

const createCampaign = async () => {
  if (!newCampaignName) return;
  try {
    await api.post('/campaigns', { name: newCampaignName });
    setNewCampaignName('');
    setIsCampaignModalOpen(false);
    fetchCampaigns();
  } catch (e) {
    alert("Kunde inte skapa kampanj");
  }
};

  // --- FETCHING ---
  useEffect(() => { 
    if (token && token !== 'true') { 
      fetchCampaigns();
    } 
  }, [token]);

  useEffect(() => {
  if (currentMap?.id) {
    fetchMarkers(currentMap.id);
  }
}, [currentMap]); // Denna ser till att rätt markörer alltid laddas till rätt karta

  useEffect(() => {

    if (currentCampaign?.id){
    // Nollställ aktiva val när vi byter kampanj
      setCurrentMap(null);
      setSelectedLore(null);

      fetchMaps();
      fetchLore();
      fetchCategories();
      fetchAllMarkers();
  }
 }, [currentCampaign]);

  const fetchMaps = async () => { 
    try {
      const res = await api.get(`/maps?campaignId=${currentCampaign.id}`);

      setMaps(res.data || []);
      if (res.data.length > 0 && !currentMap) setCurrentMap(res.data[0]); 
    } catch(e) {}
  };

  const fetchMarkers = async (id) => { const res = await api.get(`/maps/${id}/markers`); setMarkers(res.data); };
  const fetchAllMarkers = async () => { 
  try { 
    const res = await api.get(`/markers?campaignId=${currentCampaign.id}`); 
    setAllMarkers(res.data); 
  } catch(e) {} 
};
  const fetchLore = async () => { 
  // Lägg till campaignId här!
  const res = await api.get(`/lore?campaignId=${currentCampaign.id}`); 
  setLoreEntries(res.data); 
};
  const fetchCategories = async () => { 
  try { 
    // Lägg till campaignId här!
    const res = await api.get(`/categories?campaignId=${currentCampaign.id}`); 
    setCategories(res.data); 
  } catch(e) {}
};

  // --- ACTIONS ---
  const createCategory = async (type) => {
    if (!newCatName) return;
    await api.post('/categories', { name: newCatName, type: type, CampaignId: currentCampaign.id });
    setNewCatName('');
    setShowCatInput({ ...showCatInput, [type]: false });
    fetchCategories();
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Radera kategori?")) return;
    await api.delete(`/categories/${id}`);
    fetchCategories(); fetchMaps(); fetchLore();
  };

  const deleteMarker = async (id) => {
  if (!window.confirm("Vill du radera denna markör?")) return;
  try {
    await api.delete(`/maps/markers/${id}`);
    fetchMarkers(currentMap.id); // Uppdaterar markörerna på nuvarande karta
    fetchAllMarkers(); // Uppdaterar söklistan i sidofältet
  } catch (err) {
    console.error("Kunde inte radera:", err);
  }
};

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await axios.post(endpoint, { username, password });
      if (isRegistering) { setIsRegistering(false); alert("Konto skapat!"); }
      else { localStorage.setItem('token', res.data.token); setToken(res.data.token); }
    } catch (err) { alert("Auth error"); }
  };

  const handleCreateLore = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', loreForm.title);
    fd.append('content', loreForm.content);
    fd.append('campaignId', currentCampaign.id);
    if (loreForm.categoryId) fd.append('categoryId', loreForm.categoryId);
    if (loreForm.file) fd.append('loreImage', loreForm.file);

    try {
      await api.post('/lore', fd);
      setLoreForm({ title: '', content: '', file: null, categoryId: '' });
      setIsLoreModalOpen(false);
      fetchLore();
    } catch (err) {
      alert("Kunde inte skapa lore-inlägg");
    }
  };

  const handleMoveItem = async (type, id, newCategoryId) => {
    const categoryId = newCategoryId === "" ? null : parseInt(newCategoryId);
    try {
        // Använd din axios-instans här istället
        const response = await api.patch(`/${type}/${id}/move`, { categoryId });

        // Axios kastar fel om status inte är 2xx, så om vi når hit gick det bra
        if (type === 'lore') {
            setLoreEntries(prev => prev.map(item => item.id === id ? { ...item, categoryId } : item));
        } else {
            setMaps(prev => prev.map(item => item.id === id ? { ...item, categoryId } : item));
        }
    } catch (err) {
        console.error("Fel vid flytt:", err);
        alert("Kunde inte flytta objektet.");
    }
};

  const handleCreateMarker = async () => {
                const payload = {
                  label: markerData.label,
                  posX: tempMarkerPos.x,
                  posY: tempMarkerPos.y,
                  MapId: currentMap.id,
                  type: markerData.type,
                  // Om det är lore, skicka LoreId. Om det är portal, skicka targetMapId.
                  LoreId: markerData.type === 'lore' ? markerData.linkId : null,
                  targetMapId: markerData.type === 'portal' ? markerData.linkId : null
                };

                try {

                  await api.post('/maps/markers', payload);
                setIsMarkerModalOpen(false);
                fetchMarkers(currentMap.id);
                setMarkerData({ label: '', type: 'info', linkId: '' }); // Reset

                } catch(err) {
                  alert("Kunde inte skapa markör");
                }

                
              };

// --- SEARCH ---
  // Först: Definiera sökning för Lore
  const filteredLore = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (!s) return loreEntries;
    
    return loreEntries.filter(entry => 
      entry.title.toLowerCase().includes(s) || 
      (entry.content && entry.content.toLowerCase().includes(s))
    );
  }, [loreEntries, searchTerm]);

  // Sedan: Definiera sökning för Kartor och Markörer
  const filteredMaps = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (!s) return maps;

    return maps.map(m => {
      // Hitta markörer som matchar sökordet på denna karta
      const matchingMarkers = allMarkers.filter(marker => 
        marker.MapId === m.id && 
        marker.label.toLowerCase().includes(s)
      );

      const mapMatches = m.name.toLowerCase().includes(s);
      
      // Om kartan matchar eller har matchande markörer, behåll den
      if (mapMatches || matchingMarkers.length > 0) {
        return { ...m, matchedMarkers: matchingMarkers };
      }
      return null;
    }).filter(Boolean);
  }, [maps, searchTerm, allMarkers]);

  // --- IMPORT / EXPORT ---
  const downloadMarkers = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(markers, null, 2));
    const link = document.createElement('a'); link.setAttribute("href", dataStr);
    link.setAttribute("download", `markers_${currentMap?.name}.json`); link.click();
  };

  const importMarkers = async (e) => {
    const file = e.target.files[0]; if (!file || !currentMap) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        for (const m of imported) { await api.post('/maps/markers', { ...m, MapId: currentMap.id }); }
        fetchMarkers(currentMap.id);
      } catch (err) { alert("Fel vid import."); }
    };
    reader.readAsText(file);
  };

  // --- HELPERS ---
  const parseLoreText = (text) => {
    if (!text) return "";
    const parts = text.split(/(\[\[.*?\]\]|\[img:.*?\]|\[map:.*?\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[img:') && part.endsWith(']')) {
        const content = part.slice(5, -1);
        const [filename, width] = content.split('|').map(s => s.trim());

        return (
          <img 
            key={index} 
            src={`${API_BASE}/${filename}`} 
            className="lore-inline-img" 
            alt="" 
            style={{
              // Om width finns, lägg till 'px', annars kör 100% bredd
              width: width ? `${width}px` : '100%', 
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              margin: '20px 0',
              borderRadius: '8px'
            }}
          />
        );
      }

      if (part.startsWith('[map:') && part.endsWith(']')) {
        const mapName = part.slice(5, -1);
        const targetMap = maps.find(m => m.name.toLowerCase() === mapName.toLowerCase());

        if (targetMap) {
          return (
            <span key={index} className="map-link-inline" 
              onClick={() => {
                setCurrentMap(targetMap); // Byt till rätt karta
                setSelectedLore(null);    // Stäng ner lore-vyn så man ser kartan
              }}
            >
              🗺️ {mapName}
            </span>
          );
        }
        return <span key={index} className="broken-link">📍 {mapName}</span>;
      }
      
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const title = part.slice(2, -2);
        const entry = loreEntries.find(e => e.title.toLowerCase() === title.toLowerCase());
        if (entry) {
          return (
            <span key={index} className="lore-link" 
              onClick={() => {
                setHoverPreview({ visible: false, entry: null, x: 0, y: 0})
                setSelectedLore(entry); setIsEditing(false); }}
              onMouseMove={(e) => setHoverPreview({ visible: true, entry: entry, x: e.clientX + 10, y: e.clientY + 20 })}
              onMouseLeave={() => setHoverPreview(p => ({ ...p, visible: false }))}
            >
              {title}
            </span>
          );
        }
        return <span key={index} className="broken-link">{title}</span>;
      }
      return part;
    });
  };

  const renderItem = (item, type) => {
    const isActive = (type === 'map' && currentMap?.id === item.id) || (type === 'lore' && selectedLore?.id === item.id);
    
    return (
      <div key={item.id} className="nav-item-container">
        <div className={`nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-text" onClick={() => {
            if(type === 'map') { setCurrentMap(item); setSelectedLore(null); }
            else { setSelectedLore(item); setIsEditing(false); }
          }}>
            {type === 'map' ? '🗺' : '📜'} {item.name || item.title}
          </span>

          {/* Flytt-meny */}
          <select 
            className="cat-move-select"
            value={item.categoryId || item.CategoryId || ""} 
            onChange={(e) => handleMoveItem(type === 'map' ? 'maps' : 'lore', item.id, e.target.value)}
          >
            <option value="">Flytta till...</option>
            {categories.filter(c => c.type === (type === 'map' ? 'map' : 'lore')).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            <option value="">Ingen kategori</option>
          </select>

          <button className="delete-small" onClick={async (e) => {
              e.stopPropagation();
              if(window.confirm("Radera?")) {
                type === 'map' ? await api.delete(`/maps/${item.id}`) : await api.delete(`/lore/${item.id}`);
                type === 'map' ? fetchMaps() : fetchLore();
              }
          }}>🗑</button>
        </div>

        {/* Visa markörer om man söker på en karta */}
        {type === 'map' && searchTerm && item.matchedMarkers?.length > 0 && (
          <div className="nested-marker-results">
            {item.matchedMarkers.map(m => (
              <div key={m.id} className="nested-marker-item" onClick={() => { setCurrentMap(item); setSelectedLore(null); }}>
                <span>{m.type === 'portal' ? '🌀' : '📍'}</span> {m.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryGroup = (typeLabel, items, typeKey) => {
  const typeCats = categories.filter(c => c.type === typeKey);
  
  return (
    <div className="sidebar-section">
      <h4 className="section-label">{typeLabel}</h4>
      
      {/* 1. SEKTION FÖR LÖSA DOKUMENT (UTAN KATEGORI) */}
      <div className="un-categorized-items">
        {items.filter(i => !i.categoryId && !i.CategoryId).map(i => renderItem(i, typeKey))}
      </div>
      
      {/* 2. SEKTION FÖR MAPPAR (KATEGORIER) */}
      {typeCats.map(cat => {
          const catItems = items.filter(i => i.categoryId === cat.id || i.CategoryId === cat.id);
          
          // Om vi söker och mappen är tom, visa den inte
          if (searchTerm && catItems.length === 0) return null;
          
          return (
            <div key={cat.id} className={`category-block ${collapsedCats[cat.id] ? 'collapsed' : ''}`}>
              <div className="category-header" onClick={() => setCollapsedCats(p => ({...p, [cat.id]: !p[cat.id]}))}>
                <span>{collapsedCats[cat.id] ? '▶' : '▼'} {cat.name.toUpperCase()}</span>
                <button className="delete-cat-btn" onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}>×</button>
              </div>
              
              {!collapsedCats[cat.id] && (
                <div className="category-content">
                  {catItems.map(i => renderItem(i, typeKey))}
                </div>
              )}
            </div>
          );
      })}

      {/* 3. KNAPP FÖR ATT SKAPA NY KATEGORI */}
      {!searchTerm && (
        <div className="cat-adder-area">
          {showCatInput[typeKey] ? (
            <div className="mini-input-group">
              <input 
                autoFocus
                className="sidebar-input tiny" 
                placeholder="Namn..." 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && createCategory(typeKey)} 
              />
              <button className="add-btn-tiny" onClick={() => createCategory(typeKey)}>OK</button>
              <button className="add-btn-tiny cancel" onClick={() => setShowCatInput({...showCatInput, [typeKey]: false})}>×</button>
            </div>
          ) : (
            <button className="dashed-add-btn" onClick={() => setShowCatInput({...showCatInput, [typeKey]: true})}>
              + Ny kategori
            </button>
          )}
        </div>
      )}
    </div>
  );
};

  // --- RENDER ---
  if (!token || token === 'true' || token === 'null') {
  return (
    <div className="auth-outer">
      <div className="auth-background-effects">
        <div className="grid-overlay"></div>
        <div className="glow-sphere"></div>
      </div>
      
      <form className="login-card" onSubmit={handleAuthSubmit}>
        <div className="auth-header">
          <div className="engine-logo-hex large">
            <div className="hex-inner"></div>
          </div>
          <h1>WORLD ENGINE</h1>
          <p className="auth-subtitle">Har inget konto? Skapa nytt konto!</p>
        </div>

        <div className="auth-body">
          <div className="input-field">
            <label>Användarnamn</label>
            <input 
              placeholder="Användarnamn..." 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-field">
            <label>Lösenord</label>
            <input 
              type="password" 
              placeholder="Lösenord..." 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="auth-primary-btn">
            {isRegistering ? 'Skapa konto' : 'Logga in'}
          </button>
        </div>

        <div className="auth-footer">
          <p onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? '← Tillbaka till logga in' : 'Har du inget konto?'}
          </p>
        </div>
      </form>
    </div>
  );
}



  return (
    <div className="app-container">
      {/* 1. OM INTE INLOGGAD: VISA LOGIN (Samma som du hade innan) */}
      {(!token || token === 'true' || token === 'null') ? (
        <div className="auth-outer">
          <div className="auth-background-effects">
            <div className="grid-overlay"></div>
            <div className="glow-sphere"></div>
          </div>
          
          <form className="login-card" onSubmit={handleAuthSubmit}>
            <div className="auth-header">
              <div className="engine-logo-hex large">
                <div className="hex-inner"></div>
              </div>
              <h1>WORLD ENGINE</h1>
              <p className="auth-subtitle">{isRegistering ? 'Skapa ett nytt konto' : 'Logga in på ditt konto'}</p>
            </div>

            <div className="auth-body">
              <div className="input-field">
                <label>Användarnamn</label>
                <input 
                  placeholder="Användarnamn..." 
                  onChange={e => setUsername(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="input-field">
                <label>Lösenord</label>
                <input 
                  type="password" 
                  placeholder="Lösenord..." 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="auth-primary-btn">
                {isRegistering ? 'Skapa konto' : 'Logga in'}
              </button>
            </div>

            <div className="auth-footer">
              <p onClick={() => setIsRegistering(!isRegistering)} style={{cursor: 'pointer'}}>
                {isRegistering ? '← Tillbaka till logga in' : 'Har du inget konto? Registrera här'}
              </p>
            </div>
          </form>
        </div>
      ) : 
      
      /* 2. INLOGGAD MEN INGEN KAMPANJ VALD: VISA DASHBOARD */
      !currentCampaign ? (
        <div className="auth-outer">
          <div className="login-card campaign-selection" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="auth-header">
              <div className="engine-logo-hex large"><div className="hex-inner"></div></div>
              <h1>Mina världar</h1>
              <p className="auth-subtitle">Välj en värld att hantera eller skapa en ny</p>
            </div>
            
            <div className="campaign-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '20px', 
              margin: '30px 0' 
            }}>
              {campaigns.map(c => (
                <div key={c.id} className="campaign-card" onClick={() => setCurrentCampaign(c)} 
                      style={{ 
                        position: 'relative', // VIKTIGT för att placera krysset rätt
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '30px', 
                        borderRadius: '12px', 
                        cursor: 'pointer', 
                        textAlign: 'center', 
                        border: '1px solid #333',
                        transition: '0.2s'
                      }}>
                  
                  {/* --- RADERA-KNAPP --- */}
                  <button 
                    className="delete-campaign-btn"
                    onClick={async (e) => {
                      e.stopPropagation(); // Hindrar kampanjen från att öppnas
                      if(window.confirm(`Radera "${c.name}" och allt innehåll?`)) {
                        try {
                          await api.delete(`/campaigns/${c.id}`);
                          fetchCampaigns(); // Uppdaterar listan
                        } catch(err) {
                          alert("Kunde inte radera kampanj");
                        }
                      }
                    }}
                  >
                    ×
                  </button>

                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🌍</div>
                  <h3 style={{ margin: 0, color: '#fff' }}>{c.name.toUpperCase()}</h3>
                </div>
              ))}
              
              <div className="campaign-card add-new" onClick={() => setIsCampaignModalOpen(true)}
                   style={{ 
                     background: 'rgba(0,123,255,0.1)', 
                     padding: '30px', 
                     borderRadius: '12px', 
                     cursor: 'pointer', 
                     textAlign: 'center', 
                     border: '2px dashed #007bff' 
                   }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>+</div>
                <h3 style={{ margin: 0 }}>Ny värld</h3>
              </div>
            </div>

            <button onClick={handleLogout} className="logout-btn" style={{ width: '100%' }}>Logga ut</button>
          </div>

          {/* MODAL FÖR NY VÄRLD */}
          {isCampaignModalOpen && (
            <div className="glass-modal">
              <div className="modal-content">
                <h3>Skapa ny värld</h3>
                <input 
                  className="sidebar-input" 
                  placeholder="Världsnamn (t.ex. Azeroth)..." 
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                />
                <button className="auth-primary-btn" onClick={createCampaign}>Skapa värld</button>
                <button className="auth-footer p" style={{background:'none', border:'none', color:'#888', cursor: 'pointer'}} onClick={() => setIsCampaignModalOpen(false)}>Avbryt</button>
              </div>
            </div>
          )}
        </div>
      ) : (

        /* 3. KAMPANJ VALD: VISA EDITORN */
        <>
          <aside className="sidebar">
            <div className="sidebar-header">
                <button className="back-btn" onClick={() => { setCurrentCampaign(null); setMaps([]); setLoreEntries([]); }} 
                        style={{ background: '#222', border: '1px solid #444', color: '#ccc', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px' }}>
                  🏠 DASHBOARD
                </button>
                <button onClick={handleLogout} className="logout-btn">Logga ut</button>
            </div>

            <div className="world-info" style={{padding: '10px', borderBottom: '1px solid #333'}}>
              <small style={{color: '#888', fontSize: '0.7rem'}}>Nuvarande värld:</small>
              <div style={{color: '#007bff', fontWeight: 'bold', fontSize: '0.9rem'}}>{currentCampaign.name.toUpperCase()}</div>
            </div>

            <input className="sidebar-search" placeholder="Sök..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            
            <div className="sidebar-scrollable">
              {renderCategoryGroup("KARTOR", filteredMaps, "map")}
              {!searchTerm && (
                 <form className="mini-upload-form" onSubmit={async (e) => {
                    e.preventDefault(); 
                    const fd = new FormData(); 
                    fd.append('mapImage', uploadMapData.file); 
                    fd.append('name', uploadMapData.name);
                    fd.append('campaignId', currentCampaign.id);
                    await api.post('/maps/upload', fd); 
                    fetchMaps();
                }}>
                    <input placeholder="Kartnamn" onChange={e => setUploadMapData({...uploadMapData, name: e.target.value})} />
                    <input type="file" onChange={e => setUploadMapData({...uploadMapData, file: e.target.files[0]})} />
                    <button type="submit" className="add-btn">Ladda upp karta</button>
                </form>
              )}

              <hr className="sidebar-divider" />

              {renderCategoryGroup("LORE", filteredLore, "lore")}
              {!searchTerm && <button className="add-btn" onClick={() => setIsLoreModalOpen(true)}>+ Ny Lore</button>}
            </div>

            <div className="sidebar-footer">
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button className="data-btn-small" style={{ flex: 1 }} onClick={downloadMarkers}>📥 EXPORTERA</button>
                  <label className="data-btn-small" style={{ flex: 1, margin: 0, cursor: 'pointer' }}>
                    📤 IMPORTERA
                    <input type="file" accept=".json" onChange={importMarkers} style={{display:'none'}}/>
                  </label>
                </div>
            </div>
          </aside>

          <main className="viewport">
            {selectedLore ? (
              <div className="lore-view">
                <header className="lore-header">
                  <button className="back-btn" onClick={() => setSelectedLore(null)}>← BACK</button>
                  
                  {/* Om vi redigerar, visa en input för titeln, annars h1 */}
                  {isEditing ? (
                    <input 
                      className="edit-title-input"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    />
                  ) : (
                    <h1>{selectedLore.title}</h1>
                  )}

                  <div className="lore-actions">
                    <button className="edit-btn" onClick={() => {
                      if(!isEditing) setEditForm({ title: selectedLore.title, content: selectedLore.content });
                      setIsEditing(!isEditing);
                    }}>
                      {isEditing ? 'CANCEL' : 'EDIT'}
                    </button>
                    
                    {isEditing && (
                      <button className="edit-btn save" onClick={async () => {
                        try {
                          // Skicka PUT-anropet till din nya backend-route
                          const res = await api.put(`/lore/${selectedLore.id}`, editForm);
                          setSelectedLore(res.data); 
                          setIsEditing(false); 
                          fetchLore(); // Uppdatera listan i sidofältet
                        } catch (err) {
                          alert("Kunde inte spara ändringar");
                        }
                      }}>SAVE</button>
                    )}
                  </div>
                </header>

                <div className="lore-scroll">
                  {selectedLore.imageUrl && <img src={`${API_BASE}/${selectedLore.imageUrl}`} alt="" className="lore-img" />}
                  
                  <div className="lore-text">
                    {isEditing ? (
                      <textarea 
                        className="edit-content-textarea"
                        value={editForm.content}
                        onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                      />
                    ) : (
                      parseLoreText(selectedLore.content)
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <TransformWrapper doubleClick={{ disabled: true }}
                initialScale={1}
                minScale={0.1}
                maxScale={8}
                limitToBounds={false}
              >
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                  <div className="map-canvas" 
                    onMouseDown={(e) => setMouseDownPos({x: e.clientX, y: e.clientY})}
                    onMouseUp={(e) => {
                        const isBg = e.target.classList.contains('map-canvas') || e.target.classList.contains('main-image');
                        if (!isBg || !mouseDownPos) return;
                        if (Math.abs(e.clientX - mouseDownPos.x) < 5) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTempMarkerPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
                            setIsMarkerModalOpen(true);
                        }
                    }}>
                    {currentMap && <img src={`${API_BASE}/${currentMap.imageUrl}`} className="main-image" draggable="false" alt="" />}
                    {markers.map(m => (
                      <div 
                        key={m.id} 
                        className={`marker type-${m.type}`} 
                        style={{ left: `${m.posX}%`, top: `${m.posY}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (m.type === 'portal' && m.targetMapId) {
                            const target = maps.find(map => map.id === parseInt(m.targetMapId));
                            if (target) {
                              setMarkers([]);
                              setCurrentMap(target);
                            } 
                          } else if (m.type === 'lore' && m.LoreId) {
                            const target = loreEntries.find(l => l.id === parseInt(m.LoreId));
                            if (target) setSelectedLore(target);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          deleteMarker(m.id);
                        }}
                      >
                        <div className="marker-icon">
                          {m.type === 'portal' ? '🌀' : m.type === 'lore' ? '📜' : '📍'}
                        </div>
                        <span className="marker-label">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </TransformComponent>
              </TransformWrapper>
            )}
          </main>
        </>
      )}

      {/* MODALER (Markers, Lore, Hover - De ligger utanför den villkorliga loopen för de används i editorn) */}
      {isMarkerModalOpen && (
        <div className="glass-modal">
          <div className="modal-content">
            <h3>Ny markering</h3>
            <input className="sidebar-input" placeholder="Label..." value={markerData.label} onChange={e => setMarkerData({...markerData, label: e.target.value})} />
            <select className="sidebar-input" value={markerData.type} onChange={e => setMarkerData({...markerData, type: e.target.value, linkId: ''})}>
              <option value="info">INFO (Bara text)</option>
              <option value="lore">LORE (Länk till loresida)</option>
              <option value="portal">Karta (Länk till karta)</option>
            </select>
            {markerData.type === 'lore' && (
              <select className="sidebar-input" onChange={e => setMarkerData({...markerData, linkId: e.target.value})}>
                <option value="">Välj lore...</option>
                {loreEntries.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            )}
            {markerData.type === 'portal' && (
              <select className="sidebar-input" onChange={e => setMarkerData({...markerData, linkId: e.target.value})}>
                <option value="">Välj karta...</option>
                {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            <button className="auth-primary-btn" onClick={handleCreateMarker}>Skapa markering</button>
            <button className="auth-footer p" style={{background:'none', border:'none', color:'#888', cursor: 'pointer'}} onClick={() => setIsMarkerModalOpen(false)}>Avbryt</button>
          </div>
        </div>
      )}

      {/* --- MODAL: SKAPA LORE --- */}
      {isLoreModalOpen && (
        <div className="glass-modal">
          <div className="modal-content lore-modal">
            <h3>Skapa lore</h3>
            
            <form onSubmit={handleCreateLore}>
              <input 
                className="sidebar-input" 
                placeholder="Titel (t.ex The Great Forest)..." 
                value={loreForm.title} 
                onChange={e => setLoreForm({...loreForm, title: e.target.value})} 
                required
              />
              
              <select 
                className="sidebar-input" 
                value={loreForm.categoryId} 
                onChange={e => setLoreForm({...loreForm, categoryId: e.target.value})}
              >
                <option value="">Ingen kategori</option>
                {categories.filter(c => c.type === 'lore').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <textarea 
                className="sidebar-input tall" 
                style={{ minHeight: '200px' }}
                placeholder="Skriv din berättelse... Använd [[Länk]] för lore eller [img:filnamn.png] för bilder." 
                value={loreForm.content} 
                onChange={e => setLoreForm({...loreForm, content: e.target.value})}
              />

              <div className="file-input-wrapper" style={{ margin: '10px 0', fontSize: '0.8rem' }}>
                <label>Rubrik bild (Optional):</label><br/>
                <input 
                  type="file" 
                  onChange={e => setLoreForm({...loreForm, file: e.target.files[0]})} 
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="auth-primary-btn">Spara lore</button>
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => setIsLoreModalOpen(false)}
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- HOVER PREVIEW --- */}
      {hoverPreview.visible && (
        <div 
          className="hover-preview" 
          style={{ 
            position: 'fixed',
            left: hoverPreview.x, 
            top: hoverPreview.y,
            pointerEvents: 'none',
            zIndex: 9999,
            background: '#1a1a1a',
            border: '1px solid #444',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            maxWidth: '250px'
          }}
        >
          <h4 style={{ margin: '0 0 5px 0', color: '#007bff' }}>
            {hoverPreview.entry?.title}
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccc', lineHeight: '1.4' }}>
            {hoverPreview.entry?.content?.substring(0, 150)}...
          </p>
        </div>
      )}

    </div>
  );
}

export default App;