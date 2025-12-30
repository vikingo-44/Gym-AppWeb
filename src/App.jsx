import React, { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
    User, Mail, Lock, CheckCircle, ArrowLeft, CreditCard, Eye, EyeOff, Loader2, 
    Plus, LogOut, ChevronRight, UserPlus, Search, X, 
    RefreshCcw, Key, Save, PlusCircle, Trash2, Zap, Calendar, List,
    Dumbbell, Filter, Minus, Info, ShieldCheck, AlertCircle, PlusSquare, Settings, History,
    Check, XCircle as XIcon, ChevronDown, ChevronUp, ClipboardList, Target, Sparkles, Layout,
    MessageSquare, AlignLeft, Edit3, Target as TargetIcon, ChevronLeft, Fingerprint, Shield
} from 'lucide-react';

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN GLOBAL Y UTILIDADES
// ----------------------------------------------------------------------
const API_URL = "https://gym-app-backend-e9bn.onrender.com"; 
const LOGO_URL = "https://raw.githubusercontent.com/vikingo-44/Gym-App-Backend/main/assets/logoND.png";
const BG_IMAGE_URL = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1500&auto=format&fit=crop";

const formatDisplayDate = (dateString) => {
    if (!dateString) return 'SIN FECHA';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return 'FECHA INVÁLIDA';
};

const formatTimestamp = (isoString) => {
    if (!isoString) return 'SIN FECHA';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'FECHA INVÁLIDA';
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8);
};

// ----------------------------------------------------------------------
// 2. CONTEXTO DE AUTENTICACIÓN
// ----------------------------------------------------------------------
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const parseToken = (token) => {
        try {
            if (!token || !token.includes('.')) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { 
                dni: payload.sub, 
                rol: payload.rol, 
                nombre: payload.nombre, 
                id: payload.user_id || payload.id 
            };
        } catch (e) { return null; }
    };

    const signIn = (token) => {
        const decoded = parseToken(token);
        if (decoded) {
            setAuthToken(token);
            setUserRole(decoded.rol);
            setUserData(decoded);
            localStorage.setItem('userToken', token);
            localStorage.setItem('userRole', decoded.rol);
        }
    };

    const signOut = () => {
        setAuthToken(null);
        setUserRole(null); 
        setUserData(null);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRole');
        window.location.reload(); 
    };
    
    useEffect(() => {
        const storedToken = localStorage.getItem('userToken');
        const storedRole = localStorage.getItem('userRole');
        if (storedToken && storedRole) {
            const decoded = parseToken(storedToken);
            if (decoded) {
                setAuthToken(storedToken);
                setUserRole(storedRole);
                setUserData(decoded);
            }
        }
        setIsLoading(false);
    }, []);

    const contextValue = {
        authToken, userRole, userData, isLoading, signIn, signOut,
        API_URL, isAuthenticated: !!authToken, isProfessor: userRole === 'Profesor'
    };

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return context;
};

// ----------------------------------------------------------------------
// 3. COMPONENTES DE UI
// ----------------------------------------------------------------------
const Input = ({ placeholder, value, onChange, type = 'text', Icon, isPassword = false, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="mb-3 w-full text-left">
            <div className="flex items-center rounded-2xl h-14 px-4 border border-gray-800 bg-[#1C1C1E] focus-within:border-[#3ABFBC] transition-all shadow-inner">
                {Icon && <Icon size={18} className="text-[#A9A9A9] mr-3" />}
                <input
                    className="flex-1 bg-transparent text-white text-[16px] font-medium outline-none placeholder:text-gray-600 w-full"
                    style={{ colorScheme: 'dark' }} 
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={onChange}
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    {...props}
                />
                {isPassword && (
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#A9A9A9] p-2 transition-colors hover:text-white">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
};

const Notification = ({ msg, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!msg) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`p-4 rounded-2xl border shadow-2xl flex items-center gap-3 ${
                type === 'error' ? 'bg-red-900 border-red-500 text-white' : 'bg-[#1C1C1E] border-[#3ABFBC] text-[#3ABFBC]'
            }`}>
                {type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
                <p className="text-[10px] font-black uppercase tracking-widest flex-1 italic">{msg}</p>
                <button onClick={onClose} className="opacity-50 hover:opacity-100"><X size={16}/></button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 4. MODALES
// ----------------------------------------------------------------------

const PublicResetPasswordModal = ({ isVisible, onClose }) => {
    const { API_URL } = useAuth();
    const [dni, setDni] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        if (isVisible) { setDni(''); setNewPass(''); setConfirm(''); setMsg({ text: '', type: '' }); }
    }, [isVisible]);

    if (!isVisible) return null;

    const handleReset = async () => {
        if (!dni || !newPass || !confirm) return setMsg({ text: "COMPLETA TODOS LOS CAMPOS", type: "error" });
        if (newPass !== confirm) return setMsg({ text: "LAS CLAVES NO COINCIDEN", type: "error" });
        if (newPass.length < 6) return setMsg({ text: "MÍNIMO 6 CARACTERES", type: "error" });

        setLoading(true); setMsg({ text: '', type: '' });
        try {
            await axios.patch(`${API_URL}/users/student/reset-password/${dni}`, { password: newPass });
            setMsg({ text: "CLAVE CAMBIADA CON ÉXITO", type: "success" });
            setTimeout(() => onClose(), 2000);
        } catch (e) {
            const errorMsg = e.response?.data?.detail || "ERROR: DNI NO ENCONTRADO";
            setMsg({ text: errorMsg.toString().toUpperCase(), type: "error" });
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#1C1C1E] w-full max-w-sm rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl text-left">
                <div className="text-center mb-6">
                    <Fingerprint size={40} strokeWidth={2.5} className="text-[#3ABFBC] mx-auto mb-2" />
                    <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">RECUPERAR ACCESO</h2>
                    <p className="text-[9px] text-[#A9A9A9] font-black uppercase tracking-widest mt-1 italic">INGRESA TU DNI Y NUEVA CLAVE</p>
                </div>
                {msg.text && <div className={`mb-4 p-3 rounded-xl text-[10px] font-black text-center uppercase tracking-widest ${msg.type === 'error' ? 'bg-red-900/40 text-red-500 border border-red-500/50' : 'bg-[#3ABFBC]/20 text-[#3ABFBC] border border-[#3ABFBC]/50'}`}>{msg.text}</div>}
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block tracking-widest">Tu DNI</label>
                    <Input placeholder="DNI SIN PUNTOS" Icon={CreditCard} value={dni} onChange={e => setDni(e.target.value)} />
                    
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mt-4 mb-1 block tracking-widest">Nueva Contraseña</label>
                    <Input placeholder="NUEVA CLAVE" Icon={Lock} value={newPass} onChange={e => setNewPass(e.target.value)} isPassword />
                    <Input placeholder="CONFIRMAR CLAVE" Icon={CheckCircle} value={confirm} onChange={e => setConfirm(e.target.value)} isPassword />
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 bg-gray-800 h-14 rounded-2xl text-white font-bold uppercase text-[10px] tracking-widest">CANCELAR</button>
                    <button onClick={handleReset} disabled={loading} className="flex-1 bg-[#3ABFBC] text-black h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center shadow-lg active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin" /> : "CAMBIAR CLAVE"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditGroupModal = ({ isVisible, onClose, group, onUpdate }) => {
    const { authToken, API_URL } = useAuth();
    const [name, setName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState(null);

    useEffect(() => {
        if (isVisible && group) {
            setName(group.name || '');
            setDueDate(group.due_date ? group.due_date.split('T')[0] : '');
            setRoutines(group.items.map(a => ({
                id: a.routine.id,
                nombre: a.routine.nombre,
                descripcion: a.routine.descripcion || "",
                exercises: a.routine.exercise_links.map(el => ({ ...el }))
            })));
        }
    }, [isVisible, group]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const groupId = group.id.replace('group-', '');
            await axios.patch(`${API_URL}/routines-group/${groupId}`, { 
                nombre: name, 
                fecha_vencimiento: dueDate 
            }, { headers: { Authorization: `Bearer ${authToken}` } });

            for (const r of routines) {
                await axios.patch(`${API_URL}/routines/${r.id}`, {
                    nombre: r.nombre,
                    descripcion: r.descripcion,
                    exercises: r.exercises.map(ex => ({
                        exercise_id: ex.exercise.id,
                        sets: parseInt(ex.sets),
                        repetitions: ex.repetitions.toString(),
                        peso: ex.peso.toString(),
                        notas: ex.notas || "",
                        order: ex.order
                    }))
                }, { headers: { Authorization: `Bearer ${authToken}` } });
            }
            onUpdate();
            onClose();
        } catch (e) {
            console.error("Error al guardar cambios:", e);
        } finally {
            setLoading(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto">
            <div className="bg-[#1C1C1E] w-full max-w-2xl rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl my-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black italic text-[#3ABFBC] uppercase tracking-tighter">AJUSTAR PLAN</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={32}/></button>
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block">Nombre del Plan</label>
                            <Input value={name} onChange={e => setName(e.target.value)} Icon={Zap} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block">Vencimiento</label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} Icon={Calendar} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[#3ABFBC] font-black uppercase text-[10px] tracking-widest border-b border-gray-800 pb-2 italic text-left">Contenido del Entrenamiento</p>
                        {routines.map((r, rIdx) => (
                            <div key={r.id} className="bg-black/40 border border-gray-800 rounded-2xl overflow-hidden">
                                <button onClick={() => setExpandedIdx(expandedIdx === rIdx ? null : rIdx)} className="w-full p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                                    <span className="text-white font-black uppercase italic text-sm">{r.nombre}</span>
                                    {expandedIdx === rIdx ? <ChevronUp size={18} className="text-[#3ABFBC]"/> : <ChevronDown size={18} className="text-gray-500"/>}
                                </button>
                                {expandedIdx === rIdx && (
                                    <div className="p-4 space-y-4 border-t border-gray-800/50 text-left">
                                        <div className="bg-black border border-gray-800 rounded-xl p-3">
                                            <label className="text-[8px] font-black text-[#A9A9A9] uppercase mb-1 block">Objetivo / Descripción del Día</label>
                                            <textarea 
                                                value={r.descripcion} 
                                                onChange={e => {
                                                    const n=[...routines]; 
                                                    n[rIdx] = { ...n[rIdx], descripcion: e.target.value };
                                                    setRoutines(n);
                                                }}
                                                className="w-full bg-transparent text-white font-bold italic text-[12px] outline-none resize-none h-12 uppercase" 
                                            />
                                        </div>
                                        {r.exercises.map((ex, eIdx) => (
                                            <div key={eIdx} className="bg-[#1C1C1E] p-4 rounded-xl border border-gray-800 shadow-inner">
                                                <p className="text-[#3ABFBC] font-black uppercase text-[11px] mb-3 italic">{ex.exercise.nombre}</p>
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase mb-1 block">Sets</label>
                                                        <input type="number" value={ex.sets} onChange={e => {
                                                            const n=[...routines]; 
                                                            const day = { ...n[rIdx] };
                                                            day.exercises = [...day.exercises];
                                                            day.exercises[eIdx] = { ...day.exercises[eIdx], sets: e.target.value };
                                                            n[rIdx] = day;
                                                            setRoutines(n);
                                                        }} className="w-full bg-black rounded-lg p-2 text-white font-bold border border-gray-800 text-xs text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase mb-1 block">Reps</label>
                                                        <input type="text" value={ex.repetitions} onChange={e => {
                                                            const n=[...routines]; 
                                                            const day = { ...n[rIdx] };
                                                            day.exercises = [...day.exercises];
                                                            day.exercises[eIdx] = { ...day.exercises[eIdx], repetitions: e.target.value };
                                                            n[rIdx] = day;
                                                            setRoutines(n);
                                                        }} className="w-full bg-black rounded-lg p-2 text-white font-bold border border-gray-800 text-xs text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase mb-1 block">Peso</label>
                                                        <input type="text" value={ex.peso} onChange={e => {
                                                            const n=[...routines]; 
                                                            const day = { ...n[rIdx] };
                                                            day.exercises = [...day.exercises];
                                                            day.exercises[eIdx] = { ...day.exercises[eIdx], peso: e.target.value };
                                                            n[rIdx] = day;
                                                            setRoutines(n);
                                                        }} className="w-full bg-black rounded-lg p-2 text-white font-bold border border-gray-800 text-xs text-center" />
                                                    </div>
                                                </div>
                                                <textarea value={ex.notas || ""} onChange={e => {
                                                    const n=[...routines]; 
                                                    const day = { ...n[rIdx] };
                                                    day.exercises = [...day.exercises];
                                                    day.exercises[eIdx] = { ...day.exercises[eIdx], notas: e.target.value };
                                                    n[rIdx] = day;
                                                    setRoutines(n);
                                                }} className="w-full bg-black/50 p-2 rounded-lg border border-gray-800 text-[11px] text-gray-400 italic h-16 resize-none" placeholder="NOTAS DEL EJERCICIO..." />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-10 flex gap-4">
                    <button onClick={onClose} className="flex-1 h-16 bg-gray-800 rounded-2xl text-white font-black uppercase text-xs tracking-widest active:scale-95 transition-all">CANCELAR</button>
                    <button onClick={handleSave} disabled={loading} className="flex-1 h-16 bg-[#3ABFBC] text-black font-black uppercase italic rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center">
                        {loading ? <Loader2 className="animate-spin"/> : "GUARDAR AJUSTES"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StudentInfoModal = ({ isVisible, onClose, student, onUpdate }) => {
    const { authToken, API_URL } = useAuth();
    const [editData, setEditData] = useState({ nombre: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        if (student && isVisible) {
            setEditData({ 
                nombre: student.nombre || '', 
                email: student.email || ''
            });
            setMsg({ text: '', type: '' });
        }
    }, [student, isVisible]);

    const handleSave = async () => {
        setLoading(true); setMsg({ text: '', type: '' });
        try {
            await axios.patch(`${API_URL}/users/student/${student.id}`, editData, { headers: { Authorization: `Bearer ${authToken}` } });
            setMsg({ text: 'ACTUALIZADO CON ÉXITO', type: 'success' });
            setTimeout(() => { onUpdate(); onClose(); }, 1500);
        } catch (e) { 
            const errDetail = e.response?.data?.detail || 'ERROR';
            setMsg({ text: errDetail.toString().toUpperCase(), type: 'error' }); 
        }
        finally { setLoading(false); }
    };

    if (!isVisible || !student) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1C1C1E] w-full max-sm:w-[95%] max-w-sm rounded-[2rem] border border-gray-800 p-8 shadow-2xl relative text-left">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={24}/></button>
                <div className="text-center mb-6"><h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">DATOS DEL ALUMNO</h2></div>
                {msg.text && <div className={`mb-4 p-3 rounded-xl text-[10px] font-black text-center uppercase tracking-widest ${msg.type === 'error' ? 'bg-red-900/40 text-red-500 border border-red-500/50' : 'bg-[#3ABFBC]/20 text-[#3ABFBC] border border-[#3ABFBC]/50'}`}>{msg.text}</div>}
                <div className="space-y-1">
                    <label className="text-[11px] font-black text-[#A9A9A9] uppercase ml-2 mb-1 block tracking-widest">Nombre Completo</label>
                    <Input placeholder="NOMBRE" Icon={User} value={editData.nombre} onChange={e => setEditData({...editData, nombre: e.target.value})} />
                    <label className="text-[11px] font-black text-[#A9A9A9] uppercase ml-2 mb-1 block tracking-widest">Email</label>
                    <Input placeholder="EMAIL" Icon={Mail} value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} />
                </div>
                <button onClick={handleSave} disabled={loading} className="w-full bg-[#3ABFBC] h-14 rounded-2xl font-black text-black mt-6 uppercase italic shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                    {loading ? <Loader2 className="animate-spin" /> : "GUARDAR CAMBIOS"}
                </button>
            </div>
        </div>
    );
};

const ResetPasswordModal = ({ isVisible, onClose, targetUser, mode = 'profile' }) => {
    const { authToken, API_URL } = useAuth();
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        if (isVisible) {
            setOldPass(''); setNewPass(''); setConfirm(''); setMsg({ text: '', type: '' });
        }
    }, [isVisible]);

    if (!isVisible || !targetUser) return null;

    const handleUpdate = async () => {
        if (!oldPass || !newPass || !confirm) return setMsg({ text: "COMPLETA TODOS LOS CAMPOS", type: "error" });
        if (newPass !== confirm) return setMsg({ text: "LAS CLAVES NO COINCIDEN", type: "error" });
        
        setLoading(true); setMsg({ text: '', type: '' });
        try {
            if (mode === 'profile') {
                await axios.post(`${API_URL}/users/change-password`, {
                    old_password: oldPass,
                    new_password: newPass
                }, { headers: { Authorization: `Bearer ${authToken}` } });
            } else {
                await axios.patch(`${API_URL}/users/student/${targetUser.id}`, { 
                    old_password: oldPass,
                    password: newPass 
                }, { headers: { Authorization: `Bearer ${authToken}` } });
            }
            setMsg({ text: "ACTUALIZADA", type: "success" });
            setTimeout(() => onClose(), 1500);
        } catch (e) { 
            const errorMsg = e.response?.data?.detail || "ERROR";
            setMsg({ text: errorMsg.toString().toUpperCase(), type: "error" }); 
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[210] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1C1C1E] w-full max-sm:w-[95%] max-w-sm rounded-[2rem] border border-gray-800 p-8 shadow-2xl text-left">
                <div className="text-center mb-6">
                    <Key size={32} strokeWidth={2.5} className="text-amber-500 mx-auto mb-2" />
                    <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">SEGURIDAD</h2>
                    <p className="text-[10px] text-[#A9A9A9] font-black uppercase tracking-widest mt-1.5 italic">CAMBIAR CONTRASEÑA</p>
                </div>
                {msg.text && <div className={`mb-4 p-3 rounded-xl text-[10px] font-black text-center uppercase tracking-widest ${msg.type === 'error' ? 'bg-red-900/40 text-red-500 border border-red-500/50' : 'bg-[#3ABFBC]/20 text-[#3ABFBC] border border-[#3ABFBC]/50'}`}>{msg.text}</div>}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block tracking-widest">Clave Actual</label>
                    <Input placeholder="CLAVE ACTUAL" Icon={Lock} value={oldPass} onChange={e => setOldPass(e.target.value)} isPassword />
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mt-4 mb-1 block tracking-widest">Nueva Clave</label>
                    <Input placeholder="NUEVA CLAVE" Icon={Zap} value={newPass} onChange={e => setNewPass(e.target.value)} isPassword />
                    <Input placeholder="REPETIR CLAVE" Icon={CheckCircle} value={confirm} onChange={e => setConfirm(e.target.value)} isPassword />
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 bg-gray-800 h-14 rounded-2xl text-white font-bold uppercase text-[10px] tracking-widest transition-all">CANCELAR</button>
                    <button onClick={handleUpdate} disabled={loading} className="flex-1 bg-[#3ABFBC] text-black h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center shadow-lg active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin" /> : "ACTUALIZAR"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmResetModal = ({ isVisible, student, password, onConfirm, onClose, loading }) => {
    if (!isVisible || !student) return null;
    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl text-center">
            <div className="bg-[#1C1C1E] w-full max-w-sm rounded-[2.5rem] border border-gray-800 p-10 shadow-2xl animate-in zoom-in duration-300">
                <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><AlertCircle size={40} className="text-red-500" /></div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-4 text-center">¿RESET DE CLAVE?</h2>
                <div className="bg-black/50 p-6 rounded-3xl border border-gray-800 mb-8">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mb-3">NUEVA CLAVE GENERADA</p>
                    <p className="text-3xl font-black text-[#3ABFBC] tracking-widest tabular-nums">{password}</p>
                </div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic mb-8 leading-tight text-center">ASEGÚRATE DE COPIARLA PARA <span className="text-white">{student.nombre}</span></p>
                <div className="flex flex-col gap-3">
                    <button onClick={onConfirm} disabled={loading} className="w-full bg-red-600 h-14 rounded-2xl font-black text-white italic uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-red-900/30">{loading ? <Loader2 className="animate-spin" /> : "SÍ, RESETEAR AHORA"}</button>
                    <button onClick={onClose} disabled={loading} className="w-full bg-gray-800 h-14 rounded-2xl font-black text-gray-500 italic uppercase active:scale-95 transition-all">CANCELAR</button>
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 5. LOGIN PAGE
// ----------------------------------------------------------------------
const LoginPage = () => {
    const { signIn, API_URL } = useAuth();
    const [dni, setDni] = useState('');
    const [pass, setPass] = useState('');
    const [load, setLoad] = useState(false);
    const [err, setErr] = useState('');
    const [showPublicReset, setShowPublicReset] = useState(false);

    const handleLogin = async () => {
        if(!dni || !pass) return setErr("Completa todos los campos.");
        setLoad(true); setErr('');
        try {
            const res = await axios.post(`${API_URL}/login`, { dni, password: pass });
            signIn(res.data.access_token);
        } catch (e) { setErr("Credenciales incorrectas."); }
        finally { setLoad(false); }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8 relative overflow-hidden text-center">
            <PublicResetPasswordModal isVisible={showPublicReset} onClose={() => setShowPublicReset(false)} />
            
            <div className="absolute inset-0 z-0">
                <img src={BG_IMAGE_URL} className="w-full h-full object-cover opacity-50 grayscale" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black" />
            </div>
            <div className="w-full max-sm:px-4 max-w-sm z-10 flex flex-col items-center">
                <img src={LOGO_URL} className="w-56 h-56 object-contain mb-4 filter drop-shadow-[0_0_30px_rgba(58,191,188,0.5)]" />
                <p className="text-[14px] font-black text-white uppercase tracking-[0.4em] mb-10 italic">ES HORA DE LLEGAR MUY LEJOS</p>
                {err && <div className="bg-red-600 border border-red-400 text-white p-3.5 rounded-2xl text-center mb-4 font-bold text-[10px] uppercase w-full tracking-widest">{err}</div>}
                <Input placeholder="DNI O EMAIL" Icon={User} value={dni} onChange={e => setDni(e.target.value)} />
                <Input placeholder="CONTRASEÑA" Icon={Lock} isPassword value={pass} onChange={e => setPass(e.target.value)} />
                
                <button onClick={handleLogin} disabled={load} className="w-full bg-[#3ABFBC] h-16 rounded-[1.5rem] font-black text-lg text-black mt-6 shadow-xl active:scale-95 transition-all italic uppercase flex items-center justify-center">
                    {load ? <Loader2 className="animate-spin" /> : "INICIAR SESIÓN"}
                </button>

                <button onClick={() => setShowPublicReset(true)} className="mt-8 text-[11px] font-black uppercase text-[#3ABFBC] italic tracking-widest opacity-70 hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Fingerprint size={16}/> OLVIDÉ MI CONTRASEÑA
                </button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 6. DASHBOARD PROFESOR
// ----------------------------------------------------------------------
const ProfessorDashboard = ({ navigate }) => {
    const { authToken, API_URL, signOut, userData } = useAuth();
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [toast, setToast] = useState({ msg: '', type: '' });
    const [resetConfirm, setResetConfirm] = useState({ visible: false, student: null, password: '', loading: false });

    const [currentPage, setCurrentPage] = useState(1);
    const studentsPerPage = 20;

    const refresh = useCallback(() => {
        setLoading(true);
        axios.get(`${API_URL}/users/students`, { headers: { Authorization: `Bearer ${authToken}` } })
            .then(r => setStudents(r.data))
            .catch(() => setStudents([]))
            .finally(() => setLoading(false));
    }, [API_URL, authToken]);

    useEffect(() => { refresh(); }, [refresh]);

    const openResetConfirm = (student) => {
        const newPass = generateRandomPassword();
        setResetConfirm({ visible: true, student, password: newPass, loading: false });
    };

    const handleConfirmReset = async () => {
        const { student, password } = resetConfirm;
        if (!student) return;
        setResetConfirm(prev => ({ ...prev, loading: true }));
        try {
            await axios.patch(`${API_URL}/users/student/${student.id}`, { password: password }, { headers: { Authorization: `Bearer ${authToken}` } });
            setToast({ msg: `¡RESET EXITOSO!`, type: 'success' });
            setResetConfirm({ visible: false, student: null, password: '', loading: false });
        } catch (e) {
            setToast({ msg: 'ERROR EN RESET', type: 'error' });
            setResetConfirm(prev => ({ ...prev, loading: false }));
        }
    };

    const filtered = (students || [])
        .filter(s => (s.nombre || "").toLowerCase().includes(search.toLowerCase()) || (s.dni || "").toString().includes(search))
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

    const totalPages = Math.ceil(filtered.length / studentsPerPage);
    const startIndex = (currentPage - 1) * studentsPerPage;
    const paginatedStudents = filtered.slice(startIndex, startIndex + studentsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    return (
        <div className="flex flex-col text-left flex-1">
            <Notification msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: '' })} />
            <ConfirmResetModal isVisible={resetConfirm.visible} student={resetConfirm.student} password={resetConfirm.password} loading={resetConfirm.loading} onConfirm={handleConfirmReset} onClose={() => setResetConfirm({ visible: false, student: null, password: '', loading: false })} />
            <StudentInfoModal isVisible={showInfo} onClose={() => setShowInfo(false)} student={selectedStudent} onUpdate={refresh} />
            <ResetPasswordModal isVisible={showProfile} onClose={() => setShowProfile(false)} targetUser={userData} mode="profile" />

            <header className="p-4 bg-[#1C1C1E]/80 backdrop-blur-md border-b border-gray-800 flex justify-between items-center sticky top-0 z-50 gap-2 text-left">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <img src={LOGO_URL} className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
                    <div className="text-left min-w-0">
                        <h2 className="text-[#3ABFBC] font-black text-sm sm:text-xl italic uppercase tracking-tighter leading-none truncate text-left">HOLA, {userData?.nombre?.split(' ')[0]}</h2>
                        <p className="text-[7px] sm:text-[8px] font-black text-[#A9A9A9] uppercase tracking-widest mt-1 italic text-left leading-none">VAMOS POR TODO</p>
                    </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <button onClick={refresh} className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-600 border border-gray-500 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"><RefreshCcw size={18}/></button>
                    <button onClick={() => setShowProfile(true)} className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-lg active:scale-95 transition-all"><Key size={18}/></button>
                    <button onClick={() => navigate('addStudent')} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#3ABFBC] rounded-xl flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition-all"><UserPlus size={18}/></button>
                    <button onClick={signOut} className="w-9 h-9 sm:w-10 sm:h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"><LogOut size={18}/></button>
                </div>
            </header>

            <main className="p-4 flex-1">
                <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                        <input className="w-full bg-[#1C1C1E]/80 backdrop-blur-sm h-14 pl-12 pr-4 rounded-2xl text-white font-bold outline-none border border-gray-800 focus:border-[#3ABFBC] text-[16px] shadow-inner" placeholder="BUSCAR ALUMNO..." value={search} onChange={e => setSearch(e.target.value)}/>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-3 bg-[#1C1C1E]/60 border border-gray-800 p-2 rounded-2xl shadow-xl shrink-0">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-[#3ABFBC] disabled:opacity-20 active:scale-90 transition-all shadow-inner"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="px-2 text-center min-w-[60px]">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block leading-none mb-1">Página</span>
                                <span className="text-white font-black italic text-sm tabular-nums">{currentPage} / {totalPages}</span>
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-[#3ABFBC] disabled:opacity-20 active:scale-90 transition-all shadow-inner"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#3ABFBC]" size={40}/></div> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-16">
                        {paginatedStudents.map(s => (
                            <div key={s.id} className="bg-[#1C1C1E]/80 backdrop-blur-sm rounded-3xl p-5 border border-gray-800 shadow-2xl group transition-all relative overflow-hidden min-h-[160px] text-left">
                                <div className="absolute -right-4 -bottom-4 pointer-events-none z-0">
                                    <Dumbbell 
                                        className="text-white opacity-[0.04] w-28 h-28 -rotate-12 group-hover:scale-110 transition-transform duration-700" 
                                        strokeWidth={3}
                                    />
                                </div>
                                <div className="flex items-center mb-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-[#3ABFBC] flex items-center justify-center mr-4 shadow-lg shrink-0"><User size={24} color="black" /></div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <h3 className="text-sm font-black italic text-white uppercase truncate text-left">{s.nombre}</h3>
                                        <p className="text-[10px] font-black text-[#A9A9A9] uppercase tracking-tighter italic leading-none mt-1 truncate text-left">{s.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 relative z-10">
                                    <button onClick={() => { setSelectedStudent(s); setShowInfo(true); }} className="flex flex-col items-center justify-center py-3 bg-black/60 border border-gray-800 rounded-2xl text-white hover:bg-white hover:text-black active:scale-95 transition-all shadow-sm">
                                        <span className="text-[7px] font-black mt-1 uppercase text-center flex flex-col items-center"><Info size={16} strokeWidth={2.5}/> Info</span>
                                    </button>
                                    <button onClick={() => openResetConfirm(s)} className="flex flex-col items-center justify-center py-3 bg-black/60 border border-gray-800 rounded-2xl text-amber-500 hover:bg-amber-500 hover:text-black active:scale-95 transition-all shadow-sm">
                                        <span className="text-[7px] font-black mt-1 uppercase text-center flex flex-col items-center"><Key size={16} strokeWidth={2.5}/> Reset</span>
                                    </button>
                                    <button onClick={() => navigate('viewRoutine', { studentId: s.id, studentName: s.nombre })} className="flex flex-col items-center justify-center py-3 bg-black/60 border border-gray-800 rounded-2xl text-white hover:bg-white hover:text-black active:scale-95 transition-all shadow-sm">
                                        <span className="text-[7px] font-black mt-1 uppercase text-center flex flex-col items-center"><History size={16} strokeWidth={2.5}/> Histo</span>
                                    </button>
                                    <button onClick={() => navigate('createRoutineGroup', { studentId: s.id, studentName: s.nombre })} className="flex flex-col items-center justify-center py-3 bg-black/60 border border-gray-800 rounded-2xl text-[#3ABFBC] hover:bg-[#3ABFBC] hover:text-black active:scale-95 transition-all shadow-sm">
                                        <span className="text-[7px] font-black mt-1 uppercase italic text-center flex flex-col items-center"><Dumbbell size={16} strokeWidth={2.5}/> Nueva</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

// ----------------------------------------------------------------------
// 7. DASHBOARD ALUMNO
// ----------------------------------------------------------------------
const StudentDashboard = ({ navigate }) => {
    const { authToken, API_URL, signOut, userData } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showProfile, setShowProfile] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState(null); 
    const [expandedRoutine, setExpandedRoutine] = useState(null); 

    const fetchMyRoutines = useCallback(async () => {
        setLoading(true);
        try {
            const r = await axios.get(`${API_URL}/students/me/routine`, { headers: { Authorization: `Bearer ${authToken}` } });
            setAssignments(r.data);
        } catch (e) { setAssignments([]); }
        finally { setLoading(false); }
    }, [authToken, API_URL]);

    useEffect(() => { fetchMyRoutines(); }, [fetchMyRoutines]);

    const groupedAssignments = useMemo(() => {
        const groupsMap = new Map();
        assignments.forEach(a => {
            const groupObj = a.routine?.routine_group;
            const key = groupObj ? `group-${groupObj.id}` : `solo-${a.id}`;
            const groupName = groupObj?.nombre || a.routine?.nombre || "PLAN INDIVIDUAL";
            const groupDue = groupObj?.fecha_vencimiento;
            const groupProf = a.professor?.nombre || "TU ENTRENADOR";
            if (!groupsMap.has(key)) {
                groupsMap.set(key, { id: key, name: groupName, due_date: groupDue, professor_name: groupProf, date: a.assigned_at, items: [] });
            }
            groupsMap.get(key).items.push(a);
        });
        return Array.from(groupsMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [assignments]);

    return (
        <div className="flex flex-col text-left flex-1">
            <ResetPasswordModal isVisible={showProfile} onClose={() => setShowProfile(false)} targetUser={userData} mode="profile" />
            
            <header className="p-4 bg-[#1C1C1E]/80 backdrop-blur-md border-b border-gray-800 flex justify-between items-center sticky top-0 z-50 gap-2 text-left">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <img src={LOGO_URL} className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
                    <div className="text-left min-w-0">
                        <h2 className="text-[#3ABFBC] font-black text-sm sm:text-xl italic uppercase tracking-tighter leading-none truncate text-left">HOLA, {userData?.nombre?.split(' ')[0]}</h2>
                        <p className="text-[7px] sm:text-[8px] font-black text-[#A9A9A9] uppercase tracking-widest mt-1 italic text-left leading-none">MI ENTRENAMIENTO</p>
                    </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <button onClick={() => setShowProfile(true)} className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-lg active:scale-95 transition-all"><Key size={18}/></button>
                    <button onClick={signOut} className="w-9 h-9 sm:w-10 sm:h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"><LogOut size={18}/></button>
                </div>
            </header>

            <main className="p-4 flex-1">
                <h3 className="text-white font-black italic uppercase tracking-tighter text-xl mb-6 border-l-4 border-[#3ABFBC] pl-3 text-left">MI PLAN DE ENTRENAMIENTO</h3>
                
                {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#3ABFBC]" size={40}/></div> : (
                    <div className="space-y-4 pb-16">
                        {groupedAssignments.length === 0 ? (
                            <div className="text-center py-16 px-8 flex flex-col items-center opacity-40">
                                <TargetIcon size={48} className="mb-4" strokeWidth={2.5}/>
                                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px] italic">NO TENÉS RUTINAS ACTIVAS.</p>
                            </div>
                        ) : groupedAssignments.map(group => (
                            <div key={group.id} className="rounded-[2rem] border border-[#3ABFBC]/20 bg-gradient-to-b from-[#1C1C1E]/80 to-black/80 backdrop-blur-sm overflow-hidden shadow-2xl">
                                <div onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)} className="p-6 flex justify-between items-center cursor-pointer active:bg-white/5 transition-colors">
                                    <div className="flex-1 min-w-0 pr-4 text-left">
                                        <h3 className="text-2xl font-black italic uppercase text-[#3ABFBC] tracking-tighter leading-none mb-3 truncate text-left">{group.name}</h3>
                                        <div className="space-y-1.5 text-left">
                                            <div className="flex items-center gap-2"><Calendar size={14} className="text-[#3ABFBC]"/><p className="text-[12px] text-white font-black uppercase italic leading-none">VENCE: {formatDisplayDate(group.due_date)}</p></div>
                                            <div className="flex items-center gap-2"><User size={14} className="text-amber-500"/><p className="text-[12px] text-[#A9A9A9] font-black uppercase italic leading-none">{group.professor_name}</p></div>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-gray-700 shadow-inner">
                                        {expandedGroup === group.id ? <ChevronUp size={24} strokeWidth={2.5} className="text-[#3ABFBC]"/> : <ChevronDown size={24} strokeWidth={2.5} className="text-[#A9A9A9]"/>}
                                    </div>
                                </div>
                                {expandedGroup === group.id && (
                                    <div className="bg-black/40 border-t border-gray-800/50 p-4 space-y-4 animate-in slide-in-from-top-2">
                                        {group.items.map(a => (
                                            <div key={a.id} className="bg-[#1C1C1E]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-lg">
                                                <button onClick={() => setExpandedRoutine(expandedRoutine === a.id ? null : a.id)} className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
                                                    <div className="text-left"><p className="text-white font-black uppercase text-lg italic leading-none text-left">{a.routine?.nombre}</p></div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{a.routine?.exercise_links?.length || 0} EJERCICIOS</span>
                                                        <div className="w-8 h-8 rounded-lg bg-[#3ABFBC] flex items-center justify-center">
                                                            {expandedRoutine === a.id ? <ChevronUp size={16} strokeWidth={2.5} className="text-black"/> : <ChevronDown size={16} strokeWidth={2.5} className="text-black"/>}
                                                        </div>
                                                    </div>
                                                </button>
                                                {expandedRoutine === a.id && (
                                                    <div className="p-4 bg-black/40 space-y-4 border-t border-gray-800/50 text-left">
                                                        {a.routine?.descripcion && (
                                                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-2 flex gap-3 items-start text-left">
                                                                <TargetIcon size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                                                <div className="text-left">
                                                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1 text-left">OBJETIVO DEL DÍA</p>
                                                                    <p className="text-white text-[13px] font-bold italic leading-snug uppercase text-left">{a.routine.descripcion}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {a.routine?.exercise_links?.map((link, i) => (
                                                            <div key={i} className="bg-gradient-to-br from-[#1C1C1E] to-black border border-gray-800 p-5 rounded-[1.5rem] shadow-sm text-left">
                                                                <div className="flex flex-col gap-3 text-left">
                                                                    <span className="text-xl text-white font-black italic uppercase tracking-tighter leading-none text-left">{link.exercise?.nombre}</span>
                                                                    <div className="flex gap-2">
                                                                        <div className="flex-1 bg-white/5 border border-gray-800 py-2.5 rounded-xl text-center"><p className="text-[8px] text-gray-500 font-black uppercase mb-1 leading-none">Series</p><p className="text-[#3ABFBC] font-black text-sm leading-none">{link.sets}</p></div>
                                                                        <div className="flex-1 bg-white/5 border border-gray-800 py-2.5 rounded-xl text-center"><p className="text-[8px] text-gray-500 font-black uppercase mb-1 leading-none">Repeticiones</p><p className="text-[#3ABFBC] font-black text-sm leading-none">{link.repetitions}</p></div>
                                                                        {link.peso && link.peso !== "0" && <div className="flex-1 bg-white/5 border border-gray-800 py-2.5 rounded-xl text-center"><p className="text-[8px] text-gray-500 font-black uppercase mb-1 leading-none">Peso / Carga</p><p className="text-amber-500 font-black text-sm leading-none">{link.peso}kg</p></div>}
                                                                    </div>
                                                                    {link.notas && <div className="mt-2 bg-black/50 p-4 rounded-2xl border border-gray-800 shadow-inner text-left"><p className="text-[13px] text-gray-400 italic font-medium leading-snug text-left"><span className="text-[#3ABFBC] font-black not-italic mr-2 uppercase tracking-tighter text-[10px]">NOTAS:</span> {link.notas}</p></div>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

// ----------------------------------------------------------------------
// 8. HISTORIAL (VISTA PROFESOR - VISIBILIDAD GLOBAL)
// ----------------------------------------------------------------------
const StudentRoutineView = ({ navigate, studentId, studentName }) => {
    const { authToken, API_URL } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroup, setExpandedGroup] = useState(null); 
    const [expandedRoutine, setExpandedRoutine] = useState(null); 
    const [updating, setUpdating] = useState(false);
    
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedGroupToEdit, setSelectedGroupToEdit] = useState(null);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        try {
            // <--- CAMBIO CLAVE: Usamos el nuevo endpoint global para que todos vean todo --->
            const r = await axios.get(`${API_URL}/professor/assignments/student/${studentId}/global`, { headers: { Authorization: `Bearer ${authToken}` } });
            setAssignments(r.data);
        } catch (e) { setAssignments([]); }
        finally { setLoading(false); }
    }, [studentId, authToken, API_URL]);

    useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

    const handleToggleGroupActive = async (group) => {
        setUpdating(true);
        try {
            const nextStatus = !group.is_active;
            await Promise.all(group.items.map(a => axios.patch(`${API_URL}/assignments/${a.id}`, { is_active: nextStatus }, { headers: { Authorization: `Bearer ${authToken}` } })));
            fetchAssignments();
        } catch (e) { } finally { setUpdating(false); }
    };

    const groupedAssignments = useMemo(() => {
        const groupsMap = new Map();
        assignments.forEach(a => {
            const groupObj = a.routine?.routine_group;
            const key = groupObj ? `group-${groupObj.id}` : `solo-${a.id}`;
            const groupName = groupObj?.nombre || a.routine?.nombre || "PLAN INDIVIDUAL";
            if (!groupsMap.has(key)) {
                groupsMap.set(key, { 
                    id: key, 
                    name: groupName, 
                    due_date: groupObj?.fecha_vencimiento, 
                    professor_name: a.professor?.nombre || "N/A", 
                    is_active: false, 
                    date: a.assigned_at, 
                    items: [] 
                });
            }
            groupsMap.get(key).items.push(a);
            if (a.is_active) groupsMap.get(key).is_active = true;
        });
        return Array.from(groupsMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [assignments]);

    return (
        <div className="flex flex-col p-4 text-left flex-1">
            <EditGroupModal isVisible={editModalVisible} group={selectedGroupToEdit} onClose={() => setEditModalVisible(false)} onUpdate={fetchAssignments} />
            
            <header className="mb-6 text-left">
                <button onClick={() => navigate('dashboard')} className="text-[#3ABFBC] flex items-center gap-2 font-black italic uppercase tracking-tighter mb-4 text-sm group transition-transform"><ArrowLeft size={18} strokeWidth={2.5}/> VOLVER</button>
                <h1 className="text-3xl font-black italic text-white tracking-tighter uppercase leading-none text-left">HISTORIAL GLOBAL</h1>
                <p className="text-[10px] text-gray-500 font-black uppercase italic mt-1 text-left">ALUMNO: {studentName}</p>
            </header>

            {loading ? <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#3ABFBC]" size={40}/></div> : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-10 custom-scrollbar text-left">
                    {groupedAssignments.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-24 opacity-30 text-center">
                            <TargetIcon size={44} strokeWidth={2.5} className="mb-4 mx-auto" /><h2 className="text-2xl font-black italic text-white uppercase tracking-tighter text-center">SIN PLANES ASIGNADOS</h2>
                        </div>
                    ) : groupedAssignments.map(group => (
                        <div key={group.id} className={`rounded-[2rem] border bg-gradient-to-br from-[#1C1C1E]/80 to-[#0A0A0B]/80 overflow-hidden shadow-xl text-left ${group.is_active ? 'border-[#3ABFBC]' : 'border-gray-800'}`}>
                            <div onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)} className="p-6 flex justify-between items-center cursor-pointer text-left">
                                <div className="flex-1 min-w-0 pr-4 text-left">
                                    <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none mb-3 truncate text-left">{group.name}</h3>
                                    <div className="space-y-1.5 text-left font-black uppercase italic text-[10px]">
                                        <div className="flex items-center gap-2 text-left"><Calendar size={14} className="text-[#3ABFBC]"/><p className="text-white leading-none text-left">VENCE: {formatDisplayDate(group.due_date)}</p></div>
                                        <div className="flex items-center gap-2 text-left text-amber-500"><Shield size={14}/><p className="leading-none text-left">PROFESOR: {group.professor_name}</p></div>
                                        <div className="flex items-center gap-2 text-left text-gray-500"><History size={14}/><p className="leading-none text-left">FECHA: {formatTimestamp(group.date)}</p></div>
                                    </div>
                                    {group.is_active && <div className="mt-4 px-3 py-1.5 rounded-full bg-[#3ABFBC] text-black text-[10px] font-black uppercase inline-block italic">ASIGNACIÓN ACTIVA</div>}
                                </div>
                                <div className="flex flex-col gap-3 items-end shrink-0">
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedGroupToEdit(group); setEditModalVisible(true); }} className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-[#3ABFBC] border border-gray-700 shadow-lg"><Edit3 size={20} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleToggleGroupActive(group); }} disabled={updating} className={`px-5 py-3 h-12 rounded-xl text-[10px] font-black uppercase italic shadow-lg flex items-center gap-2 transition-all ${group.is_active ? 'bg-red-600 text-white' : 'bg-[#3ABFBC]'}`}>
                                            {updating ? <Loader2 className="animate-spin" size={14}/> : group.is_active ? <><XIcon size={14}/> INACTIVAR</> : <><CheckCircle size={14}/> ACTIVAR</>}
                                        </button>
                                    </div>
                                    <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-gray-700">
                                        {expandedGroup === group.id ? <ChevronUp size={28} strokeWidth={2.5} className="text-[#3ABFBC]"/> : <ChevronDown size={28} strokeWidth={2.5} className="text-[#A9A9A9]"/>}
                                    </div>
                                </div>
                            </div>
                            {expandedGroup === group.id && (
                                <div className="bg-black/40 border-t border-gray-800/50 p-4 space-y-4 text-left animate-in slide-in-from-top-2">
                                    {group.items.map(a => (
                                        <div key={a.id} className="bg-[#1C1C1E]/90 border border-gray-800 rounded-3xl overflow-hidden text-left shadow-sm">
                                            <button onClick={() => setExpandedRoutine(expandedRoutine === a.id ? null : a.id)} className="w-full p-4 flex justify-between items-center text-left">
                                                <p className="text-[#3ABFBC] font-black uppercase text-lg italic leading-none text-left">{a.routine?.nombre}</p>
                                                <div className="flex items-center gap-2 text-left">
                                                    <span className="text-[9px] font-black text-gray-600 uppercase text-left">{a.routine?.exercise_links?.length || 0} EJERCICIOS</span>
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-gray-800 flex items-center justify-center">
                                                        {expandedRoutine === a.id ? <ChevronUp size={18} strokeWidth={2.5} className="text-[#3ABFBC]"/> : <ChevronDown size={18} strokeWidth={2.5} className="text-[#A9A9A9]"/>}
                                                    </div>
                                                </div>
                                            </button>
                                            {expandedRoutine === a.id && (
                                                <div className="p-4 bg-black/60 space-y-4 border-t border-gray-800/50 text-left">
                                                    {a.routine?.descripcion && (
                                                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-start text-left">
                                                            <TargetIcon size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                                            <div className="text-left">
                                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1 text-left">OBJETIVO DEL DÍA</p>
                                                                <p className="text-white text-[13px] font-bold italic leading-snug uppercase text-left">{a.routine.descripcion}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {a.routine?.exercise_links?.map((link, i) => (
                                                        <div key={i} className="bg-[#1C1C1E] border border-gray-800 p-5 rounded-2xl text-left shadow-inner">
                                                            <div className="flex flex-col gap-3 text-left">
                                                                <span className="text-xl text-white font-black italic uppercase tracking-tighter leading-none text-left">{link.exercise?.nombre}</span>
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1 bg-black border border-gray-800 py-2 rounded-lg text-center"><p className="text-[7px] text-gray-500 font-black mb-1 leading-none uppercase text-center">Series</p><p className="text-[#3ABFBC] font-black text-xs leading-none text-center">{link.sets}</p></div>
                                                                    <div className="flex-1 bg-black border border-gray-800 py-2 rounded-lg text-center"><p className="text-[7px] text-gray-500 font-black mb-1 leading-none uppercase text-center">Repeticiones</p><p className="text-[#3ABFBC] font-black text-xs leading-none text-center">{link.repetitions}</p></div>
                                                                    {link.peso && link.peso !== "0" && <div className="flex-1 bg-black border border-gray-800 py-2 rounded-lg text-center"><p className="text-[7px] text-gray-500 font-black mb-1 leading-none uppercase text-center">Peso / Carga</p><p className="text-amber-500 font-black text-xs leading-none text-center">{link.peso}kg</p></div>}
                                                                </div>
                                                                {link.notas && <div className="mt-1 bg-black/50 p-3 rounded-xl border border-gray-800 text-left"><p className="text-xs text-gray-500 italic text-left"><span className="text-[#3ABFBC] font-black not-italic mr-2 text-[9px] uppercase text-left">NOTAS:</span> {link.notas}</p></div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 9. APP PRINCIPAL
// ----------------------------------------------------------------------
const App = () => {
    const { isAuthenticated, isProfessor, isLoading: authLoading } = useAuth();
    const [currentScreen, setCurrentScreen] = useState('login');
    const [temp, setTemp] = useState({});

    const navigate = useCallback((s, d = {}) => { setTemp(d); setCurrentScreen(s); }, []);

    useEffect(() => {
        const setAppIcons = () => {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
            link.href = LOGO_URL;
            let appleIcon = document.querySelector("link[rel~='apple-touch-icon']");
            if (!appleIcon) { appleIcon = document.createElement('link'); appleIcon.rel = 'apple-touch-icon'; document.head.appendChild(appleIcon); }
            appleIcon.href = LOGO_URL;
            document.title = "ND Training";
            
            let metaViewport = document.querySelector('meta[name="viewport"]');
            if (!metaViewport) {
                metaViewport = document.createElement('meta');
                metaViewport.name = "viewport";
                document.head.appendChild(metaViewport);
            }
            metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content";

            const metaTheme = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
            metaTheme.name = "theme-color"; metaTheme.content = "#000000";
            if (!metaTheme.parentNode) document.head.appendChild(metaTheme);
            const metaMobileCapable = document.querySelector('meta[name="mobile-web-app-capable"]') || document.createElement('meta');
            metaMobileCapable.name = "mobile-web-app-capable"; metaMobileCapable.content = "yes";
            if (!metaMobileCapable.parentNode) document.head.appendChild(metaMobileCapable);
        };
        setAppIcons();
    }, []);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) { if (currentScreen === 'login') setCurrentScreen('dashboard'); } 
            else { setCurrentScreen('login'); }
        }
    }, [isAuthenticated, authLoading, currentScreen]);

    if (authLoading) return <div className="min-h-screen bg-black flex items-center justify-center w-full"><Loader2 className="animate-spin text-[#3ABFBC]" size={40}/></div>;

    const renderScreen = () => {
        switch (currentScreen) {
            case 'login': return <LoginPage />;
            case 'dashboard': return isProfessor ? <ProfessorDashboard navigate={navigate} /> : <StudentDashboard navigate={navigate} />;
            case 'addStudent': return <AddStudentPage navigate={navigate} />;
            case 'createRoutineGroup': return <RoutineGroupPage navigate={navigate} studentId={temp.studentId} studentName={temp.studentName} />;
            case 'viewRoutine': return <StudentRoutineView navigate={navigate} studentId={temp.studentId} studentName={temp.studentName} />;
            default: return <LoginPage />;
        }
    };

    return (
        <div className="min-h-screen bg-black relative flex flex-col overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <img 
                    src={BG_IMAGE_URL} 
                    className="w-full h-full object-cover opacity-50 grayscale" 
                    alt="Global Background" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black" />
            </div>
            <div className="relative z-10 flex flex-col min-h-screen">
                {renderScreen()}
            </div>
        </div>
    );
};

const AddStudentPage = ({ navigate }) => {
    const { authToken, API_URL } = useAuth();
    const [data, setData] = useState({ nombre: '', email: '', dni: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            await axios.post(`${API_URL}/register/student`, [{ ...data, rol: 'Alumno' }], { headers: { Authorization: `Bearer ${authToken}` } });
            navigate('dashboard');
        } catch (e) { } finally { setLoading(false); }
    };

    return (
        <div className="p-6 flex flex-col items-center flex-1">
            <header className="mb-10 max-w-lg w-full text-left">
                <button onClick={() => navigate('dashboard')} className="text-[#3ABFBC] flex items-center gap-2 font-black italic uppercase tracking-tighter mb-8 text-sm group transition-transform"><ArrowLeft size={18} strokeWidth={2.5}/> VOLVER</button>
                <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase text-left">ALTA ALUMNO</h1>
            </header>
            <form onSubmit={handleSubmit} className="max-w-lg w-full space-y-4 text-left">
                <Input placeholder="NOMBRE COMPLETO" Icon={User} value={data.nombre} onChange={e => setData({...data, nombre: e.target.value})} required />
                <Input placeholder="EMAIL" Icon={Mail} value={data.email} onChange={e => setData({...data, email: e.target.value})} required />
                <Input placeholder="DNI" Icon={CreditCard} value={data.dni} onChange={e => setData({...data, dni: e.target.value})} required />
                <Input placeholder="CONTRASEÑA" Icon={Lock} value={data.password} onChange={e => setData({...data, password: e.target.value})} isPassword required />
                <button type="submit" disabled={loading} className="w-full bg-[#3ABFBC] h-16 rounded-[1.5rem] font-black text-black text-lg italic uppercase shadow-lg mt-6 active:scale-95 transition-all flex justify-center items-center">{loading ? <Loader2 className="animate-spin" /> : "REGISTRAR ALUMNO"}</button>
            </form>
        </div>
    );
};

const RoutineGroupPage = ({ navigate, studentId, studentName }) => {
    const { authToken, API_URL } = useAuth();
    const [step, setStep] = useState(1);
    const [groupData, setGroupData] = useState({ name: '', due_date: '', days: 1 });
    const [routines, setRoutines] = useState([{ nombre: 'DIA 1', descripcion: '', exercises: [] }]);
    const [availableExercises, setAvailableExercises] = useState([]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [currentDayIdx, setCurrentDayIdx] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        axios.get(`${API_URL}/exercises/`, { headers: { Authorization: `Bearer ${authToken}` } }).then(r => setAvailableExercises(r.data));
    }, [authToken, API_URL]);

    const updateDaysCount = (newCount) => {
        setGroupData({...groupData, days: newCount});
        let next = [...routines];
        if (newCount > next.length) { for(let i=next.length; i<newCount; i++) next.push({ nombre: `DIA ${i+1}`, descripcion: '', exercises: [] }); } 
        else { next = next.slice(0, newCount); }
        setRoutines(next);
    };

    const handleFinalSubmit = async () => {
        if (!groupData.name || !groupData.due_date) return;
        setIsSaving(true);
        const payload = {
            student_id: parseInt(studentId), nombre: groupData.name, fecha_vencimiento: groupData.due_date, days: groupData.days,
            routines: routines.map(r => ({ nombre: r.nombre, descripcion: r.descripcion || "", exercises: r.exercises.map((ex, idx) => ({ exercise_id: ex.id, sets: parseInt(ex.sets) || 0, repetitions: ex.repetitions.toString(), peso: ex.peso.toString(), notas: ex.notas || "", order: idx + 1 })) }))
        };
        try { await axios.post(`${API_URL}/routines-group/create-transactional`, payload, { headers: { Authorization: `Bearer ${authToken}` } }); navigate('dashboard'); } 
        catch (e) { } finally { setIsSaving(false); }
    };

    return (
        <div className="flex flex-col p-4 text-left flex-1">
            <ExerciseSelectorModal 
                isVisible={isSelectorOpen} 
                onClose={() => setIsSelectorOpen(false)} 
                existingExercises={availableExercises} 
                setAvailableExercises={setAvailableExercises}
                onAddExercise={(ex) => { 
                    const next = [...routines]; 
                    const currentDay = { ...next[currentDayIdx] };
                    currentDay.exercises = [...currentDay.exercises, { ...ex, sets: 3, repetitions: "10", peso: "0", notas: '', order: currentDay.exercises.length + 1 }];
                    next[currentDayIdx] = currentDay;
                    setRoutines(next); 
                }} 
            />
            <header className="mb-6 max-w-2xl mx-auto w-full text-left">
                <button onClick={() => step > 1 ? setStep(step - 1) : navigate('dashboard')} className="text-[#3ABFBC] flex items-center gap-2 font-black italic uppercase tracking-tighter mb-4 text-xs group transition-transform"><ArrowLeft size={18} strokeWidth={2.5}/> VOLVER</button>
                <h1 className="text-2xl font-black italic text-white tracking-tighter uppercase leading-none text-left">NUEVA RUTINA: {studentName}</h1>
                <div className="w-full h-1.5 bg-gray-800 rounded-full mt-4 overflow-hidden shadow-inner"><div className="h-full bg-[#3ABFBC] transition-all duration-500" style={{width: `${(step/2)*100}%`}}></div></div>
            </header>
            <main className="flex-1 max-w-2xl mx-auto w-full pb-10 text-left">
                {step === 1 ? (
                    <div className="space-y-4 text-left">
                        <Input placeholder="NOMBRE DEL PLAN" value={groupData.name} onChange={e => setGroupData({...groupData, name: e.target.value})} Icon={Zap} />
                        <Input type="date" value={groupData.due_date} onChange={e => setGroupData({...groupData, due_date: e.target.value})} Icon={Calendar} />
                        <div className="bg-[#1C1C1E]/80 backdrop-blur-sm p-10 rounded-[2.5rem] border border-gray-800 text-center shadow-2xl mt-6">
                            <p className="text-[#A9A9A9] font-black uppercase text-[10px] tracking-widest mb-8 opacity-60 italic text-center">Variantes de Día / Bloques</p>
                            <div className="flex justify-center items-center gap-10">
                                <button onClick={() => updateDaysCount(Math.max(1, groupData.days - 1))} className="w-14 h-14 bg-gray-800 border border-gray-700 text-white rounded-2xl flex items-center justify-center disabled:opacity-20 active:scale-90" disabled={groupData.days <= 1}><Minus strokeWidth={2.5}/></button>
                                <span className="text-7xl font-black text-[#3ABFBC] italic tabular-nums text-center">{groupData.days}</span>
                                <button onClick={() => updateDaysCount(Math.min(5, groupData.days + 1))} className="w-14 h-14 bg-[#3ABFBC] text-black rounded-2xl flex items-center justify-center disabled:opacity-20 active:scale-90" disabled={groupData.days >= 5}><Plus strokeWidth={2.5}/></button>
                            </div>
                        </div>
                        <button onClick={() => setStep(2)} className="w-full bg-[#3ABFBC] h-16 rounded-[2rem] font-black text-black text-xl italic uppercase shadow-lg mt-8 active:scale-95 transition-all">SIGUIENTE PASO</button>
                    </div>
                ) : (
                    <div className="space-y-8 text-left">
                        {routines.map((day, dIdx) => (
                            <div key={dIdx} className="bg-gradient-to-b from-[#1C1C1E]/80 to-black/80 backdrop-blur-sm p-6 rounded-[2.5rem] border-l-8 border-[#3ABFBC] shadow-2xl overflow-hidden text-left">
                                <input placeholder="Nombre" value={day.nombre} onChange={e => {const n = [...routines]; n[dIdx].nombre = e.target.value; setRoutines(n);}} className="bg-transparent text-[#3ABFBC] font-black uppercase text-2xl outline-none w-full italic border-b border-gray-800 pb-4 mb-4 text-left" />
                                <div className="mb-6 text-left">
                                    <label className="text-[10px] font-black text-[#A9A9A9] uppercase ml-2 mb-2 block tracking-widest text-left">Objetivo del día</label>
                                    <div className="flex items-start gap-3 bg-black/50 border border-gray-800 rounded-2xl p-4 focus-within:border-[#3ABFBC] transition-all text-left">
                                        <AlignLeft size={16} className="text-gray-500 mt-1" />
                                        <textarea value={day.descripcion} onChange={e => {const n = [...routines]; n[dIdx].descripcion = e.target.value; setRoutines(n);}} placeholder="EJ: ENFOQUE EN FUERZA..." rows={1} className="flex-1 bg-transparent text-[13px] text-white font-bold outline-none resize-none placeholder:opacity-50 uppercase italic text-left" />
                                    </div>
                                </div>
                                <div className="space-y-4 text-left">
                                    {day.exercises.map((ex, eIdx) => (
                                        <div key={eIdx} className="bg-black/50 p-5 rounded-2xl border border-gray-800 relative shadow-inner text-left group">
                                            <div className="flex justify-between items-center mb-4"><p className="text-white font-black uppercase text-sm italic tracking-widest group-hover:text-[#3ABFBC] transition-colors">{ex.nombre}</p><button onClick={() => {
                                                const n = [...routines]; 
                                                const updatedDay = { ...n[dIdx] };
                                                updatedDay.exercises = updatedDay.exercises.filter((_, idx) => idx !== eIdx);
                                                n[dIdx] = updatedDay;
                                                setRoutines(n);
                                            }} className="text-red-500 hover:text-red-400 active:scale-90 transition-all"><Trash2 size={20} strokeWidth={2.5}/></button></div>
                                            <div className="grid grid-cols-3 gap-3 mb-4 text-left">
                                                <div><label className="text-[9px] font-black text-[#A9A9A9] uppercase mb-1 block">Sets</label><input type="number" value={ex.sets} onChange={e => {const n = [...routines]; const d={...n[dIdx]}; d.exercises=[...d.exercises]; d.exercises[eIdx]={...d.exercises[eIdx], sets:e.target.value}; n[dIdx]=d; setRoutines(n);}} className="w-full bg-black rounded-xl p-3 text-white text-center font-bold border border-gray-700 text-sm shadow-inner outline-none"/></div>
                                                <div><label className="text-[9px] font-black text-[#A9A9A9] uppercase mb-1 block">Reps</label><input type="text" value={ex.repetitions} onChange={e => {const n = [...routines]; const d={...n[dIdx]}; d.exercises=[...d.exercises]; d.exercises[eIdx]={...d.exercises[eIdx], repetitions:e.target.value}; n[dIdx]=d; setRoutines(n);}} className="w-full bg-black rounded-xl p-3 text-white text-center font-bold border border-gray-700 text-sm shadow-inner outline-none"/></div>
                                                <div><label className="text-[9px] font-black text-[#A9A9A9] uppercase mb-1 block">Peso</label><input type="text" value={ex.peso} onChange={e => {const n = [...routines]; const d={...n[dIdx]}; d.exercises=[...d.exercises]; d.exercises[eIdx]={...d.exercises[eIdx], peso:e.target.value}; n[dIdx]=d; setRoutines(n);}} className="w-full bg-black rounded-xl p-3 text-white text-center font-bold border border-gray-800 text-sm shadow-inner outline-none"/></div>
                                            </div>
                                            <div className="text-left">
                                                <label className="text-[9px] font-black text-[#A9A9A9] uppercase mb-1 block text-left">Indicaciones del Profesor</label>
                                                <div className="flex items-start gap-3 bg-black border border-gray-800 rounded-xl p-3 focus-within:border-[#3ABFBC] transition-all">
                                                    <textarea value={ex.notas} onChange={e => {const n = [...routines]; const d={...n[dIdx]}; d.exercises=[...d.exercises]; d.exercises[eIdx]={...d.exercises[eIdx], notas:e.target.value}; n[dIdx]=d; setRoutines(n);}} placeholder="EJ: DESCANSAR 60 SEG..." rows={1} className="flex-1 bg-transparent text-[12px] text-white font-bold outline-none resize-none placeholder:opacity-50 uppercase italic leading-none text-left" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => { setCurrentDayIdx(dIdx); setIsSelectorOpen(true); }} className="w-full border-2 border-dashed border-gray-800 h-16 rounded-[1.5rem] text-[#A9A9A9] font-black uppercase text-[10px] tracking-widest mt-4 flex items-center justify-center gap-3 transition-all"><PlusSquare size={20} strokeWidth={2.5}/> AÑADIR EJERCICIO</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={handleFinalSubmit} disabled={isSaving} className="w-full bg-[#3ABFBC] h-20 rounded-[2.5rem] font-black text-black text-xl italic uppercase shadow-lg mt-10 active:scale-95 transition-all flex items-center justify-center">
                            {isSaving ? <Loader2 className="animate-spin" /> : "ASIGNAR PLAN COMPLETO"}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

const ExerciseSelectorModal = ({ isVisible, onClose, onAddExercise, existingExercises, setAvailableExercises }) => {
    const { authToken, API_URL } = useAuth();
    const [search, setSearch] = useState('');
    const [filterMuscle, setFilterMuscle] = useState('Todos');
    const [newEx, setNewEx] = useState({ nombre: '', grupo_muscular: 'Pectoral' });
    const [isCreating, setIsCreating] = useState(false);
    const [loadingCreate, setLoadingCreate] = useState(false);
    
    if (!isVisible) return null;

    const muscleGroups = ['Todos', 'Pectoral', 'Espalda', 'Piernas', 'Hombro', 'Brazos', 'Abdomen', 'Gluteos', 'Cardio'];
    
    const filtered = (existingExercises || []).filter(e => {
        const matchesName = (e.nombre || "").toLowerCase().includes(search.toLowerCase());
        const matchesMuscle = filterMuscle === 'Todos' || e.grupo_muscular === filterMuscle;
        return matchesName && matchesMuscle;
    });
    
    const handleCreateNew = async () => {
        if (!newEx.nombre || !newEx.nombre.trim()) return;
        
        setLoadingCreate(true);
        try {
            const exerciseData = [
                {
                    nombre: newEx.nombre.trim(),
                    descripcion: 'Sin descripción.', 
                    grupo_muscular: newEx.grupo_muscular, 
                }
            ];

            const r = await axios.post(`${API_URL}/exercises/`, exerciseData, { 
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json' 
                } 
            });
            
            if (r.data && r.data.length > 0) {
                const created = r.data[0];
                if (setAvailableExercises) {
                    setAvailableExercises(prev => [...prev, created]);
                }
                onAddExercise(created); 
            }
            setIsCreating(false); 
            setNewEx({ nombre: '', grupo_muscular: 'Pectoral' }); 
            onClose();
        } catch (e) { 
            console.error("Error al crear ejercicio:", e.response?.data || e); 
        } finally {
            setLoadingCreate(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4 backdrop-blur-3xl text-left">
            <div className="bg-[#1C1C1E] w-full max-w-xl rounded-[2.5rem] border border-gray-800 p-8 flex flex-col h-[80vh] shadow-2xl text-left">
                <div className="flex justify-between items-center mb-6 text-left"><h2 className="text-2xl font-black italic text-[#3ABFBC] uppercase tracking-tighter text-left">BIBLIOTECA</h2><button onClick={onClose} className="text-gray-500 hover:text-white transition-transform"><X size={32}/></button></div>
                {isCreating ? (
                    <div className="space-y-5 text-left">
                        <Input placeholder="NOMBRE" value={newEx.nombre} onChange={e => setNewEx({...newEx, nombre: e.target.value})} />
                        <label className="text-[11px] font-black text-gray-500 uppercase ml-2 mb-1 block tracking-widest text-left">Grupo Muscular</label>
                        <select className="w-full bg-[#1C1C1E] h-14 rounded-2xl px-5 border border-gray-800 text-white font-black text-xs uppercase tracking-widest italic outline-none" value={newEx.grupo_muscular} onChange={e => setNewEx({...newEx, grupo_muscular: e.target.value})}>{muscleGroups.filter(m => m !== 'Todos').map(g => <option key={g} value={g}>{g}</option>)}</select>
                        <div className="flex gap-4 pt-6 text-center">
                            <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-800 text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest">CANCELAR</button>
                            <button onClick={handleCreateNew} disabled={loadingCreate} className="flex-1 bg-[#3ABFBC] text-black h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center shadow-lg active:scale-95 transition-all">
                                {loadingCreate ? <Loader2 className="animate-spin"/> : "CREAR"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-3 mb-6 text-left">
                            <div className="relative flex-1 text-left">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                <input 
                                    className="w-full bg-black border border-gray-800 h-14 pl-14 pr-6 rounded-2xl text-white text-sm font-bold outline-none focus:border-[#3ABFBC] text-left" 
                                    placeholder="BUSCAR..." 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                />
                            </div>
                            <div className="w-36 text-left">
                                <select 
                                    className="w-full bg-black border border-gray-800 h-14 px-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest italic outline-none focus:border-[#3ABFBC]"
                                    value={filterMuscle}
                                    onChange={e => setFilterMuscle(e.target.value)}
                                >
                                    {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-left">
                            {filtered.length === 0 ? (
                                <div className="text-center py-10 opacity-30">
                                    <Search size={40} className="mx-auto mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Sin resultados</p>
                                </div>
                            ) : filtered.map(ex => (
                                <button key={ex.id} onClick={() => { onAddExercise(ex); onClose(); }} className="w-full p-5 bg-gradient-to-br from-black to-[#0d0d0d] rounded-2xl border border-gray-800 flex justify-between items-center group transition-all text-left shadow-lg">
                                    <div className="text-left">
                                        <span className="text-white font-black uppercase text-sm block group-active:text-[#3ABFBC] text-left">{ex.nombre}</span>
                                        <span className="text-[10px] text-[#A9A9A9] font-black uppercase tracking-widest text-left">{ex.grupo_muscular}</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-black border border-gray-800 flex items-center justify-center">
                                        <PlusCircle size={24} strokeWidth={2.5} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setIsCreating(true)} className="w-full bg-[#3ABFBC]/5 border border-[#3ABFBC]/30 text-[#3ABFBC] h-16 rounded-[1.5rem] text-[10px] font-black uppercase mt-6 italic active:bg-[#3ABFBC] active:text-black flex items-center justify-center gap-3 shadow-lg"><PlusSquare size={20} strokeWidth={2.5}/> CREAR NUEVO EJERCICIO</button>
                    </>
                )}
            </div>
        </div>
    );
};

const AppWrapper = () => (
    <AuthProvider>
        <App />
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            
            :root { --sat: env(safe-area-inset-top); --sab: env(safe-area-inset-bottom); }

            html, body { 
                font-family: 'Inter', sans-serif; 
                background-color: black; 
                margin: 0; 
                color: white; 
                -webkit-font-smoothing: antialiased; 
                overflow-x: hidden;
                width: 100%;
                height: 100%;
                touch-action: pan-x pan-y;
                -webkit-text-size-adjust: 100%;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                overscroll-behavior-y: none;
                text-align: left;
            }

            header { padding-top: calc(1rem + var(--sat)); }
            main { padding-bottom: calc(2rem + var(--sab)); }

            button { touch-action: manipulation; }

            input, textarea, select {
                font-size: 16px !important;
            }

            input::placeholder { color: #A9A9A9; font-weight: 700; font-size: 10px; letter-spacing: 0.15em; opacity: 0.75; text-transform: uppercase; }
            textarea::placeholder { color: #A9A9A9; font-weight: 700; font-size: 10px; letter-spacing: 0.15em; opacity: 0.75; text-transform: uppercase; }
            
            ::-webkit-scrollbar { width: 4px; }
            ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
            ::-webkit-scrollbar-track { background: transparent; }
            
            select { 
                appearance: none; 
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233ABFBC' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); 
                background-repeat: no-repeat; 
                background-position: right 0.8rem center; 
                background-size: 0.8em; 
            }
            
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .animate-in { animation-duration: 0.3s; animation-fill-mode: both; }

            .tracking-widest { letter-spacing: 0.12em; }
            .tracking-tighter { letter-spacing: -0.04em; }

            input[type="date"]::-webkit-calendar-picker-indicator {
                filter: invert(0.8) sepia(1) saturate(5) hue-rotate(130deg) brightness(1.2);
                opacity: 1;
                cursor: pointer;
                transform: scale(1.2);
            }
            
            .shadow-inner {
                box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.5);
            }
        `}</style>
    </AuthProvider>
);

export default AppWrapper;