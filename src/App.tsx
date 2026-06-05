import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, Menu, X, Waves, Car, ArrowRight, Phone, Mail, Wifi, Droplets, CookingPot, 
  Sparkles, ShoppingCart, Star, Quote, CheckCircle2, QrCode, 
  Loader2, MapPin, Camera, Settings, Send, Lock, UtensilsCrossed, Plus, Minus
} from 'lucide-react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import JSConfetti from 'js-confetti';
import emailjs from '@emailjs/browser';

// Local Assets
import heroBg from './assets/backwater-1.jpg';
import carBg from './assets/backwater-2.jpg';

// Constants
const BOOKED_DATES: { start: string, end: string }[] = [];

const FOOD_MENU = [
  { id: 'rice', name: 'Boiled Rice', price: 50 },
  { id: 'bangda-curry', name: 'Bangda Fish Curry', price: 200 },
  { id: 'bangda-fry', name: 'Bangda Fish Fry', price: 180 },
  { id: 'eagle-fry', name: 'Eagle Fish Fry', price: 250 },
  { id: 'prawns', name: 'Prawns Sukka', price: 300 },
  { id: 'shell-sukka', name: 'Sea Shell Sukka', price: 220 },
  { id: 'sardines', name: 'Sardines Fry (Tarle)', price: 150 },
];

const CAR_MODELS = [
  { id: 'swift', name: 'Swift', price: 1500 },
  { id: 'dzire', name: 'Swift Dzire', price: 1800 },
  { id: 'innova', name: 'Innova', price: 3000 },
];

const INITIAL_REVIEWS: { name: string, service: string, text: string, stars: number }[] = [];

// EMAILJS CONFIG
const EMAILJS_SERVICE_ID = 'service_ntov0s3'; 
const EMAILJS_BOOKING_TEMPLATE_ID = 'template_booking'; 
const EMAILJS_REVIEW_TEMPLATE_ID = 'template_review';   
const EMAILJS_PUBLIC_KEY = 'eFdPcinuiPwQMOwbT'; 

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'none' | 'whatsapp' | 'scanning' | 'processing' | 'success'>('none');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [isAuthorized, setIsAdminAuthorized] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [newReview, setNewReview] = useState({ name: '', text: '', stars: 5, service: 'Stay' });
  const [adminPics, setAdminPics] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const confetti = useRef<JSConfetti | null>(null);

  useEffect(() => {
    confetti.current = new JSConfetti();
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }, []);
  
  // Accommodation State
  const [roomBooking, setRoomBooking] = useState({
    checkIn: format(new Date(), 'yyyy-MM-dd'),
    checkOut: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    guests: 1,
    roomType: 'Non-AC',
    floor: '1st'
  });

  const [carBooking, setCarBooking] = useState({
    active: false,
    model: 'swift',
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 1), 'yyyy-MM-dd')
  });

  const [boatingBooking, setBoatingBooking] = useState({
    active: false,
    date: format(new Date(), 'yyyy-MM-dd'),
    timeSlot: '06:00 AM',
    duration: '1.0',
    people: 1
  });

  const [foodOrder, setFoodOrder] = useState<Record<string, number>>({});
  const [isAvailable, setIsAvailable] = useState(true);

  // Calculations
  const roomNights = useMemo(() => {
    const diff = differenceInDays(parseISO(roomBooking.checkOut), parseISO(roomBooking.checkIn));
    return diff > 0 ? diff : 0;
  }, [roomBooking.checkIn, roomBooking.checkOut]);

  const carNights = useMemo(() => {
    const diff = differenceInDays(parseISO(carBooking.end), parseISO(carBooking.start));
    return diff > 0 ? diff : 0;
  }, [carBooking.start, carBooking.end]);

  useEffect(() => {
    if (BOOKED_DATES.length === 0) {
      setIsAvailable(roomNights > 0);
      return;
    }

    const start = parseISO(roomBooking.checkIn);
    const end = parseISO(roomBooking.checkOut);
    
    const hasOverlap = BOOKED_DATES.some(b => {
      const bStart = parseISO(b.start);
      const bEnd = parseISO(b.end);
      return (start < bEnd && end > bStart);
    });
    
    setIsAvailable(!hasOverlap && roomNights > 0);
  }, [roomBooking.checkIn, roomBooking.checkOut, roomNights]);

  const totalCost = useMemo(() => {
    let cost = 0;
    cost += (roomBooking.roomType === 'AC' ? 3500 : 3000) * roomNights;
    if (carBooking.active) {
      cost += (CAR_MODELS.find(m => m.id === carBooking.model)?.price || 0) * carNights;
    }
    if (boatingBooking.active) {
      cost += boatingBooking.people * 500 * (boatingBooking.duration === '1.5' ? 1.5 : 1);
    }
    Object.entries(foodOrder).forEach(([id, qty]) => {
      cost += (FOOD_MENU.find(m => m.id === id)?.price || 0) * qty;
    });
    return cost;
  }, [roomBooking, carBooking, boatingBooking, foodOrder, roomNights, carNights]);

  const sendEmailNotification = async (type: 'booking' | 'review', data: any) => {
    try {
        const templateId = type === 'booking' ? EMAILJS_BOOKING_TEMPLATE_ID : EMAILJS_REVIEW_TEMPLATE_ID;
        await emailjs.send(EMAILJS_SERVICE_ID, templateId, data, EMAILJS_PUBLIC_KEY);
        return true;
    } catch (error: any) {
        console.error("Email send failed:", error);
        return false;
    }
  };

  const handleFinalize = () => {
    setOrderNumber('MH' + Math.random().toString(36).substr(2, 9).toUpperCase());
    setPaymentStep('scanning'); // Direct to payment, verify mobile during process
  };

  const sendWhatsAppNotification = async (details: any) => {
    // API KEY placeholder for CallMeBot (User needs to provide this)
    const apiKey = 'YOUR_CALLMEBOT_API_KEY'; 
    if (apiKey === 'YOUR_CALLMEBOT_API_KEY') {
        console.log("WhatsApp API not configured. Details:", details);
        return;
    }

    const message = `*NEW BOOKING* ID: ${details.order_number} Total: ₹${details.total_amount}. Check Email for details.`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=918431232860&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
    
    try {
        await fetch(url, { mode: 'no-cors' });
    } catch (e) {
        console.error("WhatsApp notification failed", e);
    }
  };

  const handleSimulatePayment = async () => {
    setPaymentStep('processing');
    
    const bookingDetails = {
        order_number: orderNumber,
        total_amount: totalCost,
        stay: `${roomNights} nights, Floor: ${roomBooking.floor}, ${roomBooking.guests} guests (${roomBooking.roomType})`,
        car: carBooking.active ? `${carBooking.model.toUpperCase()}` : 'None',
        boating: boatingBooking.active ? `${boatingBooking.duration}hr trip` : 'None',
        admin_email: 'mahalakshmihost@gmail.com'
    };

    // Send both in background
    await sendEmailNotification('booking', bookingDetails);
    await sendWhatsAppNotification(bookingDetails);

    setTimeout(() => {
      setPaymentStep('success');
      confetti.current?.addConfetti({ emojis: ['🌴', '🌊', '🏡', '🍤'] });
    }, 1500);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newReview.name && newReview.text) {
      setEmailStatus('sending');
      const success = await sendEmailNotification('review', {
        from_name: newReview.name,
        message: newReview.text,
        rating: newReview.stars,
        service: newReview.service,
        admin_email: 'mahalakshmihost@gmail.com'
      });
      if (success) {
        setReviews([newReview, ...reviews]);
        setNewReview({ name: '', text: '', stars: 5, service: 'Stay' });
        setEmailStatus('sent');
        setTimeout(() => setEmailStatus('idle'), 3000);
      }
    }
  };

  const handleAllInOne = () => {
    setRoomBooking(p => ({ ...p, roomType: 'AC' }));
    setCarBooking(p => ({ ...p, active: true, model: 'innova' }));
    setBoatingBooking(p => ({ ...p, active: true, duration: '1.5', timeSlot: '05:00 PM' }));
    setFoodOrder({ 'bangda-fry': 1, 'rice': 1, 'prawns': 1 });
    confetti.current?.addConfetti({ emojis: ['✨', '💎', '🔥'] });
    alert("Ultimate Luxury Package Selected!");
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '2026') { 
      setIsAdminAuthorized(true);
    } else {
      alert("Unauthorized: Incorrect PIN");
      setAdminPin('');
    }
  };

  const handleAdminUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAdminPics([url, ...adminPics]);
    }
  };

  const updateFood = (id: string, delta: number) => {
    setFoodOrder(prev => {
      const newQty = (prev[id] || 0) + delta;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newQty };
    });
  };

  return (
    <div className="min-h-screen font-sans bg-[#fdfaf5] pb-20 selection:bg-primary selection:text-white overflow-x-hidden w-full max-w-full text-[#2d2a26]">
      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed w-full z-50 bg-primary/95 backdrop-blur-xl border-b border-white/5 shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-highlight group-hover:bg-highlight/20 transition-all duration-500 shadow-xl overflow-hidden">
                <div className="relative flex flex-col items-center justify-center text-white group-hover:text-highlight">
                  <span className="text-2xl font-black font-serif leading-none -mb-1">M</span>
                  <Waves size={16} strokeWidth={3} />
                </div>
              </div>
            </div>
            <div className="leading-none text-left">
              <h1 className="text-xl font-black text-white tracking-[0.1em] uppercase mb-0.5">Mahalakshmi</h1>
              <div className="flex items-center gap-2">
                <div className="h-px w-4 bg-highlight/50"></div>
                <span className="text-[9px] font-black text-highlight uppercase tracking-[0.4em]">Coastal Lodge</span>
              </div>
            </div>
          </motion.div>
          
          <div className="hidden md:flex items-center space-x-10 font-black text-white/70 uppercase text-[10px] tracking-[0.4em]">
            {['home', 'booking', 'services', 'food', 'reviews'].map((link) => (
              <a key={link} href={`#${link}`} className="hover:text-highlight transition-colors">{link}</a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsAdminOpen(true)} className="p-2 text-white/40 hover:text-highlight hidden sm:block"><Settings size={18} /></motion.button>
            <motion.button onClick={handleFinalize} className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[10px] bg-highlight text-white uppercase tracking-widest shadow-lg shadow-orange-500/20"><ShoppingCart size={14} /><span>Book Now</span></motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white p-2 bg-white/10 rounded-lg"><Menu size={20} /></motion.button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-primary border-t border-white/5 overflow-hidden">
              <div className="px-6 py-10 flex flex-col gap-8">
                {['home', 'booking', 'services', 'food', 'reviews'].map((link) => (
                  <a key={link} href={`#${link}`} onClick={() => setIsMenuOpen(false)} className="text-white font-black uppercase text-sm tracking-[0.5em] hover:text-highlight transition-colors">{link}</a>
                ))}
                <button onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-widest"><Settings size={16} /> Lodge Admin</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2 }} className="absolute inset-0 z-0">
          <img src={heroBg} className="w-full h-full object-cover" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/30 to-[#fdfaf5]"></div>
        </motion.div>
        <div className="relative z-10 text-center px-6 mt-10">
          <span className="inline-flex items-center gap-3 px-6 py-2.5 bg-primary/20 backdrop-blur-md rounded-full text-white text-[11px] font-black uppercase tracking-[0.5em] mb-10 border border-white/10 shadow-2xl">
            <Sparkles size={16} className="text-highlight animate-pulse" /> Be Born Again
          </span>
          <h1 className="text-5xl xs:text-6xl sm:text-7xl md:text-[9rem] font-black text-white mb-8 tracking-tight leading-[0.85] uppercase drop-shadow-2xl">
            MAHALAKSHMI <br />
            <span className="text-highlight italic font-serif normal-case tracking-normal block mt-4 text-6xl md:text-[6rem]">Coastal Lodge</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-14 max-w-xl mx-auto font-medium leading-relaxed">Where the backwaters meet the wild.</p>
          <div className="flex flex-col gap-6 items-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#booking" className="bg-highlight text-white px-12 py-5 rounded-2xl text-lg font-black shadow-2xl shadow-orange-500/30 uppercase tracking-widest">Plan Your Stay</a>
                <a href="https://maps.app.goo.gl/wzTkRPYoYqFgVUkw6" target="_blank" className="bg-white/10 backdrop-blur-md text-white border-2 border-white/30 px-12 py-5 rounded-2xl text-lg font-black flex items-center justify-center gap-4 hover:bg-white/20 transition-all uppercase tracking-widest"><MapPin size={22} /> Explore Map</a>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {[
                  { label: "Rental Car", href: "#services", icon: <Car size={14} /> },
                  { label: "Boating", href: "#services", icon: <Waves size={14} /> },
                  { label: "Order Food", href: "#food", icon: <UtensilsCrossed size={14} /> }
                ].map((btn, i) => (
                  <a key={i} href={btn.href} className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/20 transition-all">{btn.icon} {btn.label}</a>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section - Nature Background */}
      <section id="booking" className="py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={carBg} className="w-full h-full object-cover" alt="Background" />
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="bg-white rounded-[3rem] sm:rounded-[5rem] shadow-3xl border border-stone-100 overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-[45%] p-10 md:p-20 bg-primary text-white space-y-12 relative overflow-hidden text-left">
              <h2 className="text-4xl sm:text-5xl font-black font-title uppercase tracking-tight">The Wilderness Experience</h2>
              <div className="grid grid-cols-1 gap-8">
                {[{icon:<Wifi/>,t:"Eco-Connect"},{icon:<Droplets/>,t:"Pure Spring"},{icon:<CookingPot/>,t:"Rustic Kitchen"}].map((item, i)=>(
                  <div key={i} className="flex gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all group">
                    <div className="text-highlight group-hover:scale-110 transition-transform">{item.icon}</div>
                    <h4 className="font-black text-lg uppercase tracking-tight">{item.t}</h4>
                  </div>
                ))}
              </div>
              <motion.button onClick={handleAllInOne} className="w-full mt-10 p-8 bg-gradient-to-br from-highlight to-secondary rounded-[2.5rem] text-white text-left relative overflow-hidden group shadow-2xl">
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1"><Sparkles size={16}/><span className="text-[10px] font-black uppercase">Signature Choice</span></div>
                    <h4 className="text-3xl font-black uppercase leading-none">Ultimate Luxury</h4>
                 </div>
                 <ShoppingCart size={120} className="absolute top-1/2 -right-8 -translate-y-1/2 opacity-10 scale-150" />
              </motion.button>
            </div>

            <div className="lg:w-[55%] p-10 md:p-20 space-y-14 text-left">
              <div className="space-y-4">
                <span className="text-highlight font-black tracking-[0.5em] uppercase text-[10px]">Your Itinerary</span>
                <h3 className="text-5xl font-black text-primary font-title uppercase leading-none">Book Your Escape</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-3"><label className="text-[11px] font-black text-primary/30 uppercase tracking-[0.4em]">Arrival</label><input type="date" value={roomBooking.checkIn} onChange={e=>setRoomBooking(p=>({...p, checkIn: e.target.value}))} className="w-full p-6 bg-stone-50 rounded-[2rem] border-2 border-transparent focus:border-primary outline-none font-black text-primary transition-all" /></div>
                <div className="space-y-3"><label className="text-[11px] font-black text-primary/30 uppercase tracking-[0.4em]">Departure</label><input type="date" value={roomBooking.checkOut} onChange={e=>setRoomBooking(p=>({...p, checkOut: e.target.value}))} className="w-full p-6 bg-stone-50 rounded-[2rem] border-2 border-transparent focus:border-primary outline-none font-black text-primary transition-all" /></div>
              </div>
              
              {roomNights === 0 ? (
                <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] flex items-center gap-5 text-amber-700 font-black uppercase text-xs">Please select at least 1 night</div>
              ) : !isAvailable ? (
                <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex items-center gap-5 text-rose-700 font-black uppercase text-sm">Fully Booked</div>
              ) : null}
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-3 text-left">
                  <label className="text-[11px] font-black text-primary/30 uppercase tracking-[0.4em] ml-2">Explorer Count</label>
                  <select value={roomBooking.guests} onChange={e=>setRoomBooking(p=>({...p, guests: parseInt(e.target.value)}))} className="w-full p-6 bg-stone-50 rounded-[2rem] border-0 outline-none font-black text-primary appearance-none cursor-pointer shadow-inner">
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guests</option>)}
                  </select>
                </div>
                <div className="space-y-3 text-left">
                  <label className="text-[11px] font-black text-primary/30 uppercase tracking-[0.4em] ml-2">Select Floor</label>
                  <select value={roomBooking.floor} onChange={e=>setRoomBooking(p=>({...p, floor: e.target.value}))} className="w-full p-6 bg-stone-50 rounded-[2rem] border-0 outline-none font-black text-primary appearance-none cursor-pointer shadow-inner">
                    <option value="1st">1st Floor</option>
                    <option value="2nd">2nd Floor</option>
                    <option value="Both">Both Floors</option>
                  </select>
                </div>
                <div className="space-y-3 text-left">
                  <label className="text-[11px] font-black text-primary/30 uppercase tracking-[0.4em] ml-2">Stay Comfort</label>
                  <div className="flex gap-3 p-2 bg-stone-100 rounded-[2rem]">
                    {['Non-AC', 'AC'].map(t => <button key={t} onClick={()=>setRoomBooking(p=>({...p, roomType: t}))} className={`flex-1 py-4 rounded-2xl font-black transition-all uppercase text-[10px] ${roomBooking.roomType === t ? 'bg-white shadow-xl text-primary scale-105' : 'text-primary/30'}`}>{t}</button>)}
                  </div>
                </div>
              </div>
              <div className="p-10 bg-primary/5 rounded-[3rem] border border-primary/5 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm">
                <div><span className="text-[10px] font-black text-primary/40 uppercase block mb-2 tracking-[0.4em]">Package Estimate</span><span className="text-5xl font-black text-primary uppercase">₹{(roomBooking.roomType === 'AC' ? 3500 : 3000) * roomNights}</span></div>
                <a href="#services" className="bg-primary text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-4">Enhance Trip <ArrowRight size={18}/></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Fleet */}
      <section id="services" className="py-40 relative overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 z-0"><img src={carBg} className="w-full h-full object-cover opacity-20" alt="Nature"/><div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/80 to-transparent"></div></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-left">
           <div className="text-center mb-24"><span className="text-highlight font-black tracking-[0.6em] uppercase text-[10px]">Lodge Services</span><h2 className="text-5xl sm:text-7xl font-black font-title uppercase tracking-tight leading-tight mt-6">Venture Further</h2></div>
           <div className="grid lg:grid-cols-2 gap-14">
              {/* Car Experience */}
              <div className={`bg-white/5 backdrop-blur-3xl p-12 md:p-16 rounded-[4rem] border-2 transition-all duration-500 ${carBooking.active ? 'border-highlight shadow-orange-500/10' : 'border-white/10'}`}>
                <div className="flex justify-between items-start mb-16"><div className="flex gap-6"><div className={`p-6 rounded-[2rem] transition-all ${carBooking.active ? 'bg-highlight text-white' : 'bg-white/10 text-highlight'}`}><Car size={40}/></div><div className="space-y-1 text-left"><h3 className="text-3xl font-black uppercase leading-none">Rental Fleet</h3><p className="text-highlight/60 text-xs font-black uppercase tracking-widest">+91 8105934576</p></div></div><button onClick={()=>setCarBooking(p=>({...p, active: !p.active}))} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase transition-all ${carBooking.active ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/40'}`}>{carBooking.active ? 'Drop Rental' : 'Add Rental'}</button></div>
                <div className="space-y-12 text-left"><div className="grid grid-cols-2 gap-6"><input type="date" value={carBooking.start} onChange={e=>setCarBooking(p=>({...p, start: e.target.value, active: true}))} className="w-full p-6 bg-white/5 rounded-[2rem] border-0 font-black text-sm text-white" /><input type="date" value={carBooking.end} onChange={e=>setCarBooking(p=>({...p, end: e.target.value, active: true}))} className="w-full p-6 bg-white/5 rounded-[2rem] border-0 font-black text-sm text-white" /></div><div className="grid grid-cols-3 gap-4">{CAR_MODELS.map(m=>(<button key={m.id} onClick={()=>setCarBooking(p=>({...p, model: m.id, active: true}))} className={`p-6 rounded-[2.5rem] border-2 transition-all text-center ${carBooking.active && carBooking.model === m.id ? 'border-highlight bg-highlight/20' : 'border-white/5'}`}><span className="block font-black text-white text-xs uppercase mb-1">{m.name}</span><span className="text-[10px] font-black text-highlight">₹{m.price}/D</span></button>))}</div></div>
              </div>
              {/* Boating Experience */}
              <div className={`bg-white/5 backdrop-blur-3xl p-12 md:p-16 rounded-[4rem] border-2 transition-all duration-500 ${boatingBooking.active ? 'border-highlight shadow-orange-500/10' : 'border-white/10'}`}>
                <div className="flex justify-between items-start mb-16"><div className="flex gap-6 text-left"><div className={`p-6 rounded-[2rem] transition-all ${boatingBooking.active ? 'bg-highlight text-white' : 'bg-white/10 text-highlight'}`}><Waves size={40}/></div><div className="space-y-1"><h3 className="text-3xl font-black uppercase leading-none">Backwater Trip</h3><p className="text-highlight/60 text-[10px] font-black uppercase tracking-widest">Honnavar Railway Bridge View</p><p className="text-accent text-[9px] font-black">+91 9686670458</p></div></div><button onClick={()=>setBoatingBooking(p=>({...p, active: !p.active}))} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase transition-all ${boatingBooking.active ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/40'}`}>{boatingBooking.active ? 'Cancel Trip' : 'Select Ride'}</button></div>
                <div className="space-y-12 text-left"><div className="grid grid-cols-1 sm:grid-cols-3 gap-6"><input type="date" value={boatingBooking.date} onChange={e=>setBoatingBooking(p=>({...p, date: e.target.value, active: true}))} className="w-full p-6 bg-white/5 rounded-[2rem] border-0 font-black text-[11px] text-white" /><select value={boatingBooking.people} onChange={e=>setBoatingBooking(p=>({...p, people: parseInt(e.target.value), active: true}))} className="w-full p-6 bg-white/5 rounded-[2rem] border-0 font-black text-[11px] text-white appearance-none cursor-pointer">{[1,2,3,4,5,6,7,8].map(n=>(<option key={n} value={n} className="text-primary">{n} Explorers</option>))}</select><div className="flex gap-2 p-1.5 bg-white/5 rounded-[2rem] h-[68px]">{['1.0','1.5'].map(d=>(<button key={d} onClick={()=>setBoatingBooking(p=>({...p, duration: d, active: true}))} className={`flex-1 rounded-[1.5rem] text-[11px] font-black transition-all ${boatingBooking.duration === d ? 'bg-highlight text-white' : 'text-highlight/40'}`}>{d}H</button>))}</div></div><div className="flex flex-wrap justify-center gap-3">{['06:00 AM','09:00 AM','12:00 PM','03:00 PM','05:00 PM'].map(slot=>(<button key={slot} onClick={()=>setBoatingBooking(p=>({...p, timeSlot: slot, active: true}))} className={`px-6 py-4 rounded-2xl text-[10px] font-black border-2 transition-all ${boatingBooking.timeSlot === slot ? 'bg-highlight border-highlight text-white' : 'bg-white/5 border-white/5 text-white/30'}`}>{slot}</button>))}</div></div>
              </div>
           </div>
        </div>
      </section>

      {/* Food Section */}
      <section id="food" className="py-40 bg-[#fdfaf5]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-24 gap-12 text-left">
            <div className="space-y-4">
              <span className="text-highlight font-black tracking-[0.6em] uppercase text-[10px]">Local Palette</span>
              <h3 className="text-5xl sm:text-6xl font-black text-primary font-title uppercase tracking-tight">Coastal Soul Food</h3>
            </div>
            <div className="bg-secondary p-10 md:p-14 rounded-[4rem] text-white max-w-md shadow-2xl relative overflow-hidden text-left">
                <span className="block text-white/40 font-black text-[10px] uppercase tracking-[0.5em] mb-4">Fresh from our Kitchen</span>
                <p className="text-2xl font-black uppercase leading-tight mb-8">Proper Coastal Food with secret local spices.</p>
                <div className="flex items-center gap-4 pt-8 border-t border-white/10">
                  <div className="p-3 bg-white/10 rounded-2xl"><Phone size={20} /></div>
                  <div><p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Order Hotline</p><p className="font-black text-2xl">+91 9886727957</p></div>
                </div>
                <CookingPot className="absolute -bottom-16 -right-16 text-white/5 w-64 h-64 -rotate-12" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-x-20 gap-y-8">
            {FOOD_MENU.map((item) => (
              <div key={item.id} className="group flex justify-between items-center p-6 bg-white rounded-[2.5rem] border border-stone-100 transition-all shadow-sm hover:shadow-xl text-left">
                <div className="space-y-1"><h4 className="font-black text-primary text-lg uppercase tracking-tight group-hover:text-highlight transition-colors">{item.name}</h4><span className="text-[11px] font-black text-secondary tracking-widest block">₹{item.price}</span></div>
                <div className="flex items-center gap-6 bg-stone-50 rounded-2xl p-2 shadow-inner">
                  <button onClick={() => updateFood(item.id, -1)} className="p-2 text-stone-300 hover:text-highlight transition-colors"><Minus size={18} /></button>
                  <span className="w-6 text-center font-black text-primary text-sm">{foodOrder[item.id] || 0}</span>
                  <button onClick={() => updateFood(item.id, 1)} className="p-2 text-stone-300 hover:text-primary transition-colors"><Plus size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-40 bg-stone-100/50">
        <div className="max-w-7xl mx-auto px-6 text-left">
           <div className="text-center mb-24 space-y-4"><span className="text-highlight font-black tracking-[0.6em] uppercase text-[10px]">Guest Chronicles</span><h2 className="text-5xl sm:text-6xl font-black text-primary font-title uppercase leading-none tracking-tight">Shared Stories</h2></div>
           <div className="grid lg:grid-cols-3 gap-16">
              <div className="bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl border border-stone-200 h-fit">
                 <div className="flex items-center gap-4 mb-12"><div className="p-4 bg-primary rounded-3xl text-white shadow-xl"><Send size={24}/></div><h3 className="text-3xl font-black text-primary font-title uppercase leading-none">Post Review</h3></div>
                 <form onSubmit={handleAddReview} className="space-y-8">
                    <div className="space-y-2"><label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.5em] ml-2">Your Name</label><input type="text" required value={newReview.name} onChange={e=>setNewReview(p=>({...p, name: e.target.value}))} className="w-full p-6 bg-stone-50 rounded-[2rem] outline-none font-black text-sm" placeholder="Explorer Name" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.5em] ml-2">Experience</label><textarea required value={newReview.text} onChange={e=>setNewReview(p=>({...p, text: e.target.value}))} className="w-full p-6 bg-stone-50 rounded-[2rem] outline-none font-black text-sm h-40 resize-none" placeholder="Tell us your story..." /></div>
                    <div className="grid grid-cols-2 gap-6">
                       <select value={newReview.stars} onChange={e=>setNewReview(p=>({...p, stars: parseInt(e.target.value)}))} className="w-full p-6 bg-stone-50 rounded-[2rem] outline-none font-black text-sm">{[5,4,3,2,1].map(n=>(<option key={n} value={n}>{n} Stars</option>))}</select>
                       <select value={newReview.service} onChange={e=>setNewReview(p=>({...p, service: e.target.value}))} className="w-full p-6 bg-stone-50 rounded-[2rem] outline-none font-black text-sm">{['Stay','Food','Boating','Cars'].map(s=>(<option key={s} value={s}>{s}</option>))}</select>
                    </div>
                    <motion.button type="submit" disabled={emailStatus === 'sending'} className={`w-full py-6 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl ${emailStatus === 'sending' ? 'opacity-50' : ''}`}>Submit Story</motion.button>
                 </form>
              </div>
              <div className="lg:col-span-2 grid md:grid-cols-2 gap-10">
                 {reviews.map((review, i)=>(
                    <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="bg-white p-10 md:p-14 rounded-[4rem] shadow-xl relative border border-stone-100 text-left">
                       <div className="absolute -top-6 -left-6 w-16 h-16 bg-highlight rounded-3xl flex items-center justify-center text-white shadow-2xl transition-transform group-hover:rotate-12"><Quote size={28} fill="currentColor"/></div>
                       <div className="flex gap-1.5 mb-8 mt-2">{[...Array(review.stars)].map((_, i)=>(<Star key={i} size={14} className="text-highlight" fill="currentColor"/>))}</div>
                       <p className="text-primary/70 font-medium mb-12 leading-relaxed italic text-lg tracking-tight">"{review.text}"</p>
                       <div className="pt-8 border-t border-stone-50 flex items-center justify-between"><div><h5 className="font-black text-primary text-xl tracking-tight leading-none mb-1">{review.name}</h5><span className="text-[10px] font-black text-highlight uppercase tracking-[0.3em] bg-stone-50 px-3 py-1 rounded-full">{review.service}</span></div></div>
                    </motion.div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Admin Panel */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-primary/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[4rem] shadow-3xl overflow-hidden relative p-10 md:p-20 text-left">
              <button onClick={()=>setIsAdminOpen(false)} className="absolute top-10 right-10 p-3 bg-stone-50 text-primary rounded-full hover:bg-stone-100"><X size={24}/></button>
              <div className="flex items-center gap-6 mb-16"><div className="p-5 bg-stone-50 rounded-[2rem] text-primary shadow-inner"><Settings size={40}/></div><div className="space-y-1 text-left"><h3 className="text-4xl font-black text-primary font-title uppercase tracking-tight leading-none">Lodge Admin</h3><p className="text-primary/30 font-black text-[10px] uppercase tracking-[0.5em]">Inventory & Media</p></div></div>
              
              {!isAuthorized ? (
                <form onSubmit={handleAdminLogin} className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center gap-6">
                    <div className="p-8 bg-stone-50 rounded-full text-primary/10 border-2 border-stone-100 shadow-inner"><Lock size={64}/></div>
                    <div className="text-center space-y-2"><h4 className="text-2xl font-black text-primary uppercase">Restricted Access</h4><p className="text-primary/40 text-xs font-bold uppercase tracking-widest px-10 leading-relaxed">Please enter your secure PIN.</p></div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[11px] font-black text-primary/30 uppercase tracking-[0.5em] ml-2 text-left">Lodge PIN</label>
                    <input type="password" value={adminPin} onChange={e=>setAdminPin(e.target.value)} placeholder="ENTER PIN" className="w-full p-8 bg-stone-50 rounded-[3rem] border-0 outline-none font-black text-center text-4xl tracking-[0.5em] text-primary shadow-inner" />
                  </div>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-6 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl">Verify Authorization</motion.button>
                </form>
              ) : (
                <div className="space-y-14 animate-in zoom-in duration-500 text-left">
                  <div className="space-y-6 text-left">
                    <label className="block text-[11px] font-black text-primary/30 uppercase tracking-[0.5em] ml-2 text-left">Upload Visuals</label>
                    <label className="w-full h-56 border-4 border-dashed border-stone-100 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all bg-stone-50/20"><Camera className="text-primary/20 mb-4" size={48} /><span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.5em]">Click to Select High-Res Photos</span><input type="file" className="hidden" accept="image/*" onChange={handleAdminUpload} /></label>
                  </div>
                  <div className="grid grid-cols-4 gap-6 max-h-80 overflow-y-auto pr-4">{adminPics.map((url, i)=>(<img key={i} src={url} className="w-full h-24 object-cover rounded-[2rem] shadow-xl border-4 border-white" alt="Admin View"/>))}</div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Flow: WhatsApp & Payment */}
      <AnimatePresence>
        {paymentStep !== 'none' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-primary/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[4rem] shadow-3xl overflow-hidden relative p-10 md:p-20 text-center">
              <button onClick={()=>setPaymentStep('none')} className="absolute top-10 right-10 p-3 bg-stone-50 text-primary rounded-full hover:bg-stone-100"><X size={24}/></button>
              
              {/* DIRECT SCANNING STEP */}
              {paymentStep === 'scanning' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center">
                    <QrCode size={32} className="text-primary mb-4" />
                    <h3 className="text-3xl font-black text-teal-950 font-title uppercase tracking-tight leading-none">Finalize Payment</h3>
                    <p className="text-primary/30 font-black text-[10px] uppercase tracking-[0.5em] mt-3 tracking-widest text-center px-10">Review and scan to complete booking</p>
                  </div>

                  {/* Detailed Service Breakdown */}
                  <div className="bg-stone-50/50 rounded-[2rem] p-6 text-left space-y-4 border border-stone-100 shadow-inner">
                    <h4 className="text-[10px] font-black text-primary/30 uppercase tracking-widest border-b border-stone-100 pb-2">Your Itinerary</h4>
                    <div className="space-y-3">
                      {roomNights > 0 && (
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="p-2 bg-white rounded-xl text-primary shadow-sm"><Home size={12} /></div>
                            <div>
                              <p className="text-xs font-black text-primary uppercase leading-none mb-1">Luxury Stay</p>
                              <p className="text-[9px] text-primary/40 font-bold">{roomNights} Nights • Floor: {roomBooking.floor} • {roomBooking.roomType}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold">₹{(roomBooking.roomType === 'AC' ? 3500 : 3000) * roomNights}</span>
                        </div>
                      )}
                      {carBooking.active && (
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="p-2 bg-white rounded-xl text-primary shadow-sm"><Car size={12} /></div>
                            <div>
                              <p className="text-xs font-black text-primary uppercase leading-none mb-1">Adventure Fleet</p>
                              <p className="text-[9px] text-primary/40 font-bold">{carBooking.model.toUpperCase()}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold">₹{(CAR_MODELS.find(m => m.id === carBooking.model)?.price || 0) * carNights}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-8">
                    <div className="bg-white p-6 rounded-[3rem] inline-block shadow-2xl border-4 border-stone-50 scale-110">
                      <QRCodeSVG value={`upi://pay?pa=mahalakshmi@upi&am=${totalCost}&cu=INR`} size={160} />
                    </div>

                    <div className="w-full flex justify-between items-center p-6 bg-primary text-white rounded-2xl shadow-xl">
                      <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total to Pay</span>
                      <span className="text-3xl font-black">₹{totalCost}</span>
                    </div>

                    <motion.button onClick={handleSimulatePayment} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-6 bg-highlight text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.5em] shadow-2xl shadow-orange-900/30">Verify & Lock Booking</motion.button>
                  </div>
                </div>
              )}

              {paymentStep === 'processing' && <div className="py-32 flex flex-col items-center space-y-8"><Loader2 className="w-16 h-16 text-primary animate-spin" /><h3 className="text-3xl font-black text-primary font-title uppercase tracking-tight">Verifying Ledger...</h3></div>}
              
              {paymentStep === 'success' && (
                <div className="space-y-12 animate-in zoom-in duration-500 text-left">
                  <div className="flex flex-col items-center text-center"><div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl"><CheckCircle2 size={48} /></div><h3 className="text-4xl font-black text-primary font-title uppercase tracking-tight leading-none">Experience Locked!</h3><p className="text-primary/40 font-bold text-[11px] uppercase tracking-widest mt-6 text-center leading-relaxed">Itinerary dispatched to lodge records and <br />guest WhatsApp confirmation underway.</p></div>
                  <div className="bg-white border-4 border-stone-50 rounded-[4rem] p-10 space-y-6 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start border-b border-stone-100 pb-8"><div className="text-left"><p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.4em] mb-2">Order Ledger</p><p className="font-black text-primary text-xl tracking-tighter">{orderNumber}</p></div><div className="text-right"><p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.4em] mb-2">Status</p><p className="font-black text-emerald-500 text-xl uppercase tracking-widest italic">Settled</p></div></div>
                    <div className="bg-primary p-8 rounded-[2.5rem] flex justify-between items-center text-white"><span className="font-black text-[10px] uppercase tracking-[0.5em] text-white/40">Total Paid</span><span className="text-4xl font-black text-highlight tracking-tighter">₹{totalCost}</span></div>
                  </div>
                  <button onClick={()=>setPaymentStep('none')} className="w-full py-6 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] shadow-2xl">Return to Lodge</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer id="contact" className="py-40 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-6 text-left">
          <div className="grid md:grid-cols-3 gap-24">
            <div className="space-y-10">
              <div className="flex items-center gap-4 text-left">
                <div className="w-14 h-14 bg-highlight rounded-[2rem] flex items-center justify-center shadow-2xl"><Waves className="text-primary w-7 h-7" /></div>
                <span className="text-4xl font-black font-title tracking-tighter uppercase leading-none text-white">Mahalakshmi <br /><span className="text-highlight italic font-serif text-2xl lowercase normal-case tracking-normal">Coastal</span></span>
              </div>
              <p className="text-white/30 font-medium leading-relaxed italic text-lg pr-10 text-left">"Redefining coastal hospitality through traditional values and modern luxury."</p>
              <div className="flex flex-col gap-4 items-start">
                <a href="mailto:mahalakshmihost@gmail.com" className="p-5 bg-white/5 rounded-[2rem] text-highlight hover:bg-highlight hover:text-white transition-all flex items-center gap-4 font-black text-[11px] uppercase tracking-widest border border-white/5"><Mail size={20} /> mahalakshmihost@gmail.com</a>
              </div>
            </div>
            <div className="space-y-12 pt-4">
              <h4 className="text-[11px] font-black uppercase tracking-[0.6em] text-highlight border-l-4 border-highlight pl-4 text-left">Connection Lines</h4>
              <div className="space-y-8">
                <div className="flex items-center gap-6 group text-left">
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/10 transition-all"><Phone className="text-highlight" size={24} /></div>
                  <div><p className="text-[10px] uppercase font-black text-white/20 tracking-[0.3em] mb-1">Stay Inquiry</p><p className="font-black text-2xl tracking-tighter text-white">+91 8431232860</p></div>
                </div>
                <div className="flex items-center gap-6 group text-left">
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/10 transition-all"><Phone className="text-highlight" size={24} /></div>
                  <div><p className="text-[10px] uppercase font-black text-white/20 tracking-[0.3em] mb-1">General Info</p><p className="font-black text-2xl tracking-tighter text-white">+91 8105934576</p></div>
                </div>
              </div>
            </div>
            <div className="space-y-12 pt-4 text-left">
              <h4 className="text-[11px] font-black uppercase tracking-[0.6em] text-highlight border-l-4 border-highlight pl-4">Lodge Location</h4>
              <p className="text-white/40 font-serif italic text-xl leading-relaxed">"Find us nestled between the serene backwaters and the roaring Arabian Sea."</p>
              <a href="https://maps.app.goo.gl/wzTkRPYoYqFgVUkw6" target="_blank" className="inline-flex items-center gap-5 text-highlight font-black uppercase text-[11px] tracking-widest hover:translate-x-3 transition-all p-6 bg-white/5 rounded-[2.5rem] border border-white/10 group"><MapPin size={24} /> Find On Map <ArrowRight size={18} /></a>
            </div>
          </div>
          <div className="mt-40 pt-10 border-t border-white/5 flex justify-between items-center text-white/20"><p className="text-[9px] font-black uppercase tracking-[0.6em]">© 2026 Mahalakshmi Coastal Lodge. Authentic wilderness experience.</p></div>
        </div>
      </footer>
    </div>
  );
};

export default App;
