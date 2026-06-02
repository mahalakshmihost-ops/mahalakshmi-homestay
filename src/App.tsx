import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, X, AlertTriangle, Waves, Car, UtensilsCrossed, 
  Plus, Minus, ArrowRight, Phone, Mail, Wifi, Droplets, CookingPot, 
  Sparkles, ShoppingCart, Star, Quote, CheckCircle2, QrCode, 
  Loader2, MapPin, Camera, Settings, Send
} from 'lucide-react';
import { format, differenceInDays, isWithinInterval, parseISO, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import JSConfetti from 'js-confetti';
import emailjs from '@emailjs/browser';

// Local Assets
import heroBg from './assets/backwater-1.jpg';
import carBg from './assets/backwater-2.jpg';

// Constants
const BOOKED_DATES = [
  { start: '2026-06-05', end: '2026-06-07' },
  { start: '2026-06-15', end: '2026-06-18' },
];

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

const INITIAL_REVIEWS = [
  { name: "Rahul Sharma", service: "Stay & Food", text: "Amazing hospitality! The Bangda fry was out of this world. Felt like home.", stars: 5 },
  { name: "Ananya Iyer", service: "Boating", text: "The 1.5 hour sunset boating trip was the highlight of our trip. So serene!", stars: 5 },
  { name: "Vikram Singh", service: "Rental Cars", text: "Very well-maintained Innova. Seamless booking process. Highly recommended.", stars: 4 },
];

// EMAILJS CONFIG (Live keys from user)
const EMAILJS_SERVICE_ID = 'service_ntov0s3'; 
const EMAILJS_BOOKING_TEMPLATE_ID = 'template_booking'; // Create this in EmailJS dashboard
const EMAILJS_REVIEW_TEMPLATE_ID = 'template_review';   // Create this in EmailJS dashboard
const EMAILJS_PUBLIC_KEY = 'eFdPcinuiPwQMOwbT'; 

const App: React.FC = () => {
  const [paymentStep, setPaymentStep] = useState<'none' | 'scanning' | 'processing' | 'success'>('none');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
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
  
  // States
  const [roomBooking, setRoomBooking] = useState({
    checkIn: format(new Date(), 'yyyy-MM-dd'),
    checkOut: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    guests: 1,
    roomType: 'Non-AC'
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
    const start = parseISO(roomBooking.checkIn);
    const end = parseISO(roomBooking.checkOut);
    const hasOverlap = BOOKED_DATES.some(b => 
      isWithinInterval(start, { start: parseISO(b.start), end: parseISO(b.end) }) ||
      isWithinInterval(end, { start: parseISO(b.start), end: parseISO(b.end) })
    );
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
        console.log(`Attempting to send ${type} email using Template ID: ${templateId}...`);
        const result = await emailjs.send(EMAILJS_SERVICE_ID, templateId, data, EMAILJS_PUBLIC_KEY);
        console.log("Email sent successfully!", result.status, result.text);
        return true;
    } catch (error: any) {
        console.error("Email send failed! Error Details:", error);
        alert(`Email Error: ${error?.text || 'Check Template ID or Service ID'}`);
        return false;
    }
  };

  const handleFinalize = () => {
    setOrderNumber('MH' + Math.random().toString(36).substr(2, 9).toUpperCase());
    setPaymentStep('scanning');
  };

  const handleSimulatePayment = async () => {
    setPaymentStep('processing');
    
    // Construct booking details for email
    const bookingDetails = {
        order_number: orderNumber,
        total_amount: totalCost,
        stay: `${roomNights} nights, ${roomBooking.guests} guests (${roomBooking.roomType})`,
        car: carBooking.active ? `${carBooking.model.toUpperCase()} from ${carBooking.start} to ${carBooking.end}` : 'None',
        boating: boatingBooking.active ? `${boatingBooking.duration}hr trip at ${boatingBooking.timeSlot}` : 'None',
        food: Object.keys(foodOrder).length > 0 ? `${Object.keys(foodOrder).length} items ordered` : 'None',
        admin_email: 'mahalakshmihost@gmail.com'
    };

    await sendEmailNotification('booking', bookingDetails);

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
        alert("Review submitted and details sent to mahalakshmihost@gmail.com!");
      } else {
        setEmailStatus('error');
      }
    }
  };

  const handleAllInOne = () => {
    setRoomBooking(p => ({ ...p, roomType: 'AC' }));
    setCarBooking(p => ({ ...p, active: true, model: 'innova' }));
    setBoatingBooking(p => ({ ...p, active: true, duration: '1.5', timeSlot: '05:00 PM' }));
    setFoodOrder({ 'bangda-fry': 1, 'rice': 1, 'prawns': 1 });
    confetti.current?.addConfetti({ emojis: ['✨', '💎', '🔥'] });
    alert("Ultimate Luxury Package Selected! Stay, Innova Rental, Sunset Boating, and Coastal Meals added.");
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
    <div className="min-h-screen font-sans bg-[#f0f9fa] pb-20 selection:bg-primary selection:text-white">
      {/* Vibrant Tropical Header */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed w-full z-50 bg-gradient-to-r from-primary via-primary to-secondary backdrop-blur-xl border-b border-white/10 shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 group-hover:border-accent group-hover:bg-accent/20 transition-all duration-500 shadow-xl overflow-hidden">
                {/* Modern "M" + Wave Emblem */}
                <div className="relative flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white group-hover:text-accent font-serif leading-none -mb-1 transition-colors">M</span>
                  <Waves size={16} className="text-accent group-hover:text-white transition-colors" strokeWidth={3} />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-accent/0 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
            <div className="leading-none text-left">
              <h1 className="text-xl font-black text-white tracking-widest uppercase mb-0.5">Mahalakshmi</h1>
              <div className="flex items-center gap-2">
                <div className="h-px w-4 bg-accent/50 group-hover:w-8 transition-all"></div>
                <span className="text-[9px] font-black text-accent uppercase tracking-[0.4em]">Coastal</span>
              </div>
            </div>
          </motion.div>
          
          <div className="hidden md:flex items-center space-x-10 font-black text-white uppercase text-[10px] tracking-[0.3em]">
            {['home', 'booking', 'services', 'food', 'reviews'].map((link) => (
              <motion.a 
                key={link}
                whileHover={{ y: -1, color: '#fcd34d' }}
                className="transition-colors cursor-pointer"
                href={`#${link}`}
              >
                {link}
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAdminOpen(true)}
              className="p-2 text-white/50 hover:text-accent transition-colors"
            >
              <Settings size={18} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFinalize}
              disabled={!isAvailable || totalCost === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${isAvailable && totalCost > 0 ? 'bg-accent text-primary shadow-accent/20' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
            >
              <ShoppingCart size={14} />
              <span>Finalize Trip</span>
              {totalCost > 0 && <span className="flex items-center justify-center bg-white text-primary w-5 h-5 rounded-full text-[10px] shadow-sm">{ (roomNights > 0 ? 1 : 0) + (carBooking.active ? 1 : 0) + (boatingBooking.active ? 1 : 0) + (Object.keys(foodOrder).length > 0 ? 1 : 0) }</span>}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 1.5 }} className="absolute inset-0 z-0">
          <img src={heroBg} className="w-full h-full object-cover" alt="Maha Coastal Backwaters" />
          <div className="absolute inset-0 bg-teal-950/40 backdrop-blur-[1px]"></div>
        </motion.div>
        <div className="relative z-10 text-center px-6">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 backdrop-blur-md rounded-full text-accent text-[10px] font-black uppercase tracking-[0.4em] mb-6 border border-accent/20 shadow-xl">
              <Sparkles size={14} /> Nature's Gateway
            </span>
            <h1 className="text-6xl md:text-[8rem] font-black text-white mb-6 tracking-tighter leading-[0.8] uppercase">
              MAHALAKSHMI <br />
              <motion.span animate={{ color: ['#ffffff', '#fcd34d', '#ffffff'] }} transition={{ duration: 5, repeat: Infinity }} className="text-accent italic font-serif normal-case tracking-normal">Homestay</motion.span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-12 max-w-xl mx-auto font-medium leading-relaxed">Escape to the serenity of our backwater homestay. Local flavors, private boating, and absolute comfort.</p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="#booking" className="bg-secondary text-white px-10 py-5 rounded-2xl text-lg font-black shadow-2xl shadow-rose-500/40">Book Your Stay</motion.a>
                <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="https://maps.app.goo.gl/wzTkRPYoYqFgVUkw6" target="_blank" className="bg-white/10 backdrop-blur-md text-white border-2 border-white/30 px-10 py-5 rounded-2xl text-lg font-black flex items-center justify-center gap-3 hover:bg-white/20 transition-all"><MapPin size={20} /> View Location</motion.a>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  { label: "Book Rental Car", href: "#services", icon: <Car size={16} /> },
                  { label: "Book Backwater Boating", href: "#services", icon: <Waves size={16} /> },
                  { label: "Order Food", href: "#food", icon: <UtensilsCrossed size={16} /> }
                ].map((btn, i) => (
                  <motion.a 
                    key={i}
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    href={btn.href}
                    className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                  >
                    {btn.icon} {btn.label}
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[4rem] shadow-3xl border border-teal-50 overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-[40%] p-10 md:p-16 bg-primary text-white space-y-10 relative">
              <h2 className="text-4xl font-black font-serif leading-tight relative z-10">Premium Stay Facilities</h2>
              <div className="grid grid-cols-1 gap-6 relative z-10">
                {[
                  { icon: <Wifi />, t: "Free WiFi", d: "High-speed fiber connectivity." },
                  { icon: <Droplets />, t: "Purified Water", d: "24/7 RO drinking water." },
                  { icon: <CookingPot />, t: "Kitchen Space", d: "Cook your own meals anytime." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-accent">{item.icon}</div>
                    <div><h4 className="font-bold text-sm">{item.t}</h4><p className="text-[10px] text-white/40">{item.d}</p></div>
                  </div>
                ))}
              </div>

              {/* All-in-One Option */}
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAllInOne}
                className="w-full mt-6 p-6 bg-gradient-to-br from-accent to-yellow-500 rounded-[2rem] text-primary relative overflow-hidden group shadow-xl"
              >
                <div className="relative z-10 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Everything We Liked</span>
                  </div>
                  <h4 className="text-xl font-black uppercase leading-none mb-1">Ultimate Luxury</h4>
                  <p className="text-[9px] font-bold opacity-80">STAY + INNOVA + BOATING + MEALS</p>
                </div>
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-20 group-hover:rotate-12 transition-transform">
                  <ShoppingCart size={80} />
                </div>
              </motion.button>

              <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            </div>
            <div className="lg:w-[60%] p-10 md:p-16 space-y-10">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-teal-900/30 uppercase tracking-[0.3em]">Check-In</label>
                  <input type="date" value={roomBooking.checkIn} onChange={e => setRoomBooking(p => ({...p, checkIn: e.target.value}))} className="w-full p-5 bg-teal-50/50 rounded-[1.5rem] border-2 border-transparent focus:border-primary outline-none font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-teal-900/30 uppercase tracking-[0.3em]">Check-Out</label>
                  <input type="date" value={roomBooking.checkOut} onChange={e => setRoomBooking(p => ({...p, checkOut: e.target.value}))} className="w-full p-5 bg-teal-50/50 rounded-[1.5rem] border-2 border-transparent focus:border-primary outline-none font-bold" />
                </div>
              </div>
              {!isAvailable && <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600 font-bold"><AlertTriangle size={24} /><span>Fully Booked on these dates.</span></div>}
              <div className="grid md:grid-cols-2 gap-8">
                <select value={roomBooking.guests} onChange={e => setRoomBooking(p => ({...p, guests: parseInt(e.target.value)}))} className="w-full p-5 bg-teal-50/50 rounded-[1.5rem] border-0 outline-none font-bold">
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guests</option>)}
                </select>
                <div className="flex gap-2 p-1.5 bg-teal-50/50 rounded-[1.5rem]">
                  {['Non-AC', 'AC'].map(t => <button key={t} onClick={() => setRoomBooking(p => ({...p, roomType: t}))} className={`flex-1 py-3 rounded-xl font-bold transition-all ${roomBooking.roomType === t ? 'bg-white shadow-md text-primary' : 'text-teal-900/30'}`}>{t}</button>)}
                </div>
              </div>
              <div className="p-8 bg-teal-50 rounded-[2.5rem] border border-teal-100 flex justify-between items-center">
                <div><span className="text-[10px] font-black text-teal-400 uppercase tracking-widest block mb-1">Total Stay</span><span className="text-4xl font-black text-teal-900">₹{(roomBooking.roomType === 'AC' ? 3500 : 3000) * roomNights}</span></div>
                <a href="#services" className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-teal-500/20">Add Services</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rental Cars - Lush Tropical UI */}
      <section id="services" className="py-32 relative overflow-hidden bg-teal-950">
        <div className="absolute inset-0 z-0">
          <img src={carBg} className="w-full h-full object-cover opacity-30" alt="Tropical Nature" />
          <div className="absolute inset-0 bg-gradient-to-tr from-teal-950 via-teal-950/80 to-transparent"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-white font-serif tracking-tight">Explore with Freedom</h2>
            <p className="text-accent font-black tracking-[0.5em] uppercase text-[10px] mt-4">Premium Rental Fleet</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-10">
            <div className={`bg-white/5 backdrop-blur-xl p-10 md:p-12 rounded-[4rem] shadow-2xl border-2 transition-all duration-500 ${carBooking.active ? 'border-accent shadow-accent/10' : 'border-white/10'}`}>
              <div className="flex justify-between items-start mb-12">
                <div className="flex gap-5">
                  <div className={`p-5 rounded-3xl transition-all ${carBooking.active ? 'bg-accent text-primary shadow-xl' : 'bg-white/10 text-teal-400'}`}><Car size={32} /></div>
                  <div className="text-left"><h3 className="text-2xl font-black text-white uppercase tracking-tighter">Rental Cars</h3><p className="text-teal-400 text-xs font-bold">+91 8105934576</p></div>
                </div>
                <button onClick={() => setCarBooking(p => ({...p, active: !p.active}))} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${carBooking.active ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}>{carBooking.active ? 'Remove' : 'Add Rental'}</button>
              </div>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={carBooking.start} onChange={e => setCarBooking(p => ({...p, start: e.target.value, active: true}))} className="w-full p-4 bg-white/10 rounded-2xl border-0 font-bold text-sm text-white outline-none" />
                  <input type="date" value={carBooking.end} onChange={e => setCarBooking(p => ({...p, end: e.target.value, active: true}))} className="w-full p-4 bg-white/10 rounded-2xl border-0 font-bold text-sm text-white outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {CAR_MODELS.map(m => (
                    <button key={m.id} onClick={() => setCarBooking(p => ({...p, model: m.id, active: true}))} className={`p-4 rounded-3xl border-2 transition-all text-center ${carBooking.active && carBooking.model === m.id ? 'border-accent bg-accent/20' : 'border-white/10 hover:border-accent/40'}`}>
                      <span className="block font-black text-white text-xs">{m.name}</span>
                      <span className="text-[10px] font-bold text-accent">₹{m.price}/d</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Boating remains premium */}
            <div className="bg-white/5 backdrop-blur-xl p-10 md:p-12 rounded-[4rem] text-white relative overflow-hidden shadow-2xl border border-white/10">
              <div className="relative z-10 flex justify-between items-start mb-12">
                <div className="flex gap-5 text-left">
                  <div className={`p-5 rounded-3xl transition-all ${boatingBooking.active ? 'bg-accent text-primary' : 'bg-white/10 text-teal-400'}`}><Waves size={32} /></div>
                  <div><h3 className="text-2xl font-black uppercase tracking-tighter">Backwater Boating</h3><p className="text-teal-400 text-[10px] font-bold mt-1">Includes Honnavar Railway Bridge View</p><p className="text-accent text-[8px] font-bold uppercase tracking-widest">+91 9686670458</p></div>
                </div>
                <button onClick={() => setBoatingBooking(p => ({...p, active: !p.active}))} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${boatingBooking.active ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/40'}`}>{boatingBooking.active ? 'Remove' : 'Select Boating'}</button>
              </div>
              <div className="relative z-10 space-y-8">
                <div className="grid grid-cols-3 gap-3">
                  <input type="date" value={boatingBooking.date} onChange={e => setBoatingBooking(p => ({...p, date: e.target.value, active: true}))} className="p-4 bg-white/10 rounded-2xl border-0 font-bold text-[10px] text-white outline-none" />
                  <select value={boatingBooking.people} onChange={e => setBoatingBooking(p => ({...p, people: parseInt(e.target.value), active: true}))} className="p-4 bg-white/10 rounded-2xl border-0 font-bold text-[10px] text-white outline-none appearance-none">
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n} className="text-teal-900">{n} People</option>)}
                  </select>
                  <div className="flex gap-1 p-1 bg-white/10 rounded-2xl">
                    {['1.0', '1.5'].map(d => <button key={d} onClick={() => setBoatingBooking(p => ({...p, duration: d, active: true}))} className={`flex-1 rounded-xl text-[10px] font-black transition-all ${boatingBooking.duration === d ? 'bg-accent text-primary' : 'text-teal-500'}`}>{d}H</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {['06:00 AM', '09:00 AM', '12:00 PM', '03:00 PM', '05:00 PM'].map(slot => (
                    <button key={slot} onClick={() => setBoatingBooking(p => ({...p, timeSlot: slot, active: true}))} className={`p-2 rounded-xl text-[8px] font-black border transition-all ${boatingBooking.timeSlot === slot ? 'bg-accent border-accent text-primary' : 'bg-white/10 border-white/5 text-white/40 hover:bg-white/20'}`}>{slot}</button>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-20 -right-20 opacity-5 pointer-events-none text-accent"><Waves size={300} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* Food Section */}
      <section id="food" className="py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-10">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2 text-secondary"><UtensilsCrossed size={20} /><span className="text-[10px] font-black uppercase tracking-[0.4em]">Dining</span></div>
              <h3 className="text-5xl font-black text-teal-950 font-serif leading-tight">Coastal Soul Food</h3>
            </div>
            <div className="bg-secondary p-8 rounded-[3rem] text-white max-w-sm shadow-2xl relative overflow-hidden">
              <span className="block text-rose-200 font-black text-[10px] uppercase tracking-[0.2em] mb-2 text-left">Fresh Home Cooked</span>
              <p className="text-lg font-bold leading-tight text-left">Proper Coastal Food at Home using secret local spices.</p>
              <p className="mt-4 font-black text-xl text-left">+91 9886727957</p>
              <CookingPot className="absolute -bottom-10 -right-10 text-white/5 w-40 h-40" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
            {FOOD_MENU.map(item => (
              <div key={item.id} className="flex justify-between items-center py-4 border-b border-teal-50 hover:bg-teal-50/20 px-4 rounded-xl transition-all">
                <div className="text-left"><h4 className="font-black text-teal-950 text-base">{item.name}</h4><span className="text-xs font-black text-teal-400">₹{item.price}</span></div>
                <div className="flex items-center gap-4 bg-white shadow-sm border border-teal-50 rounded-2xl p-1.5">
                  <button onClick={() => updateFood(item.id, -1)} className="p-1 hover:text-secondary transition-colors"><Minus size={16} /></button>
                  <span className="w-5 text-center font-black text-teal-950 text-xs">{foodOrder[item.id] || 0}</span>
                  <button onClick={() => updateFood(item.id, 1)} className="p-1 hover:text-primary transition-colors"><Plus size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Review Section - Enhanced with Form */}
      <section id="reviews" className="py-32 bg-teal-50/30 rounded-[5rem]">
        <div className="max-w-7xl mx-auto px-6 text-left">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-teal-950 font-serif mb-4">Guest Feedback</h2>
            <p className="text-teal-900/40 font-medium uppercase text-[10px] tracking-[0.4em]">Real stories from our visitors</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-teal-50 h-fit">
              <div className="flex items-center gap-3 mb-8"><Send className="text-primary" size={24} /><h3 className="text-2xl font-black text-teal-950 uppercase">Write a Review</h3></div>
              <form onSubmit={handleAddReview} className="space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Your Name</label><input type="text" required value={newReview.name} onChange={e => setNewReview(p => ({...p, name: e.target.value}))} className="w-full p-4 bg-teal-50/50 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-sm" placeholder="John Doe" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Review Text</label><textarea required value={newReview.text} onChange={e => setNewReview(p => ({...p, text: e.target.value}))} className="w-full p-4 bg-teal-50/50 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-sm h-32 resize-none" placeholder="How was your stay?" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Rating</label><select value={newReview.stars} onChange={e => setNewReview(p => ({...p, stars: parseInt(e.target.value)}))} className="w-full p-4 bg-teal-50/50 rounded-2xl outline-none font-bold text-sm">{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}</select></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Service</label><select value={newReview.service} onChange={e => setNewReview(p => ({...p, service: e.target.value}))} className="w-full p-4 bg-teal-50/50 rounded-2xl outline-none font-bold text-sm">{['Stay', 'Food', 'Boating', 'Cars'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <button type="submit" disabled={emailStatus === 'sending'} className={`w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-teal-500/20 transition-all ${emailStatus === 'sending' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}>
                  {emailStatus === 'sending' ? 'Sending...' : 'Submit Review'}
                </button>
              </form>
            </div>
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-6 h-fit">
              {reviews.map((review, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-teal-900/5 relative group border border-teal-50/50 hover:border-primary transition-all">
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-teal-900 shadow-lg group-hover:rotate-12 transition-transform"><Quote size={16} fill="currentColor" /></div>
                  <div className="flex gap-1 mb-4 mt-2">{[...Array(review.stars)].map((_, i) => <Star key={i} size={10} className="text-accent" fill="currentColor" />)}</div>
                  <p className="text-teal-900/70 font-medium mb-6 leading-relaxed italic text-xs">"{review.text}"</p>
                  <div className="pt-4 border-t border-teal-50 flex items-center justify-between"><h5 className="font-black text-teal-950 text-sm">{review.name}</h5><span className="text-[8px] font-black text-primary uppercase tracking-widest bg-teal-50 px-2 py-1 rounded-full">{review.service}</span></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Admin Dash */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-teal-950/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-3xl overflow-hidden relative p-10 md:p-12 text-left">
              <button onClick={() => setIsAdminOpen(false)} className="absolute top-8 right-8 p-2 bg-teal-50 text-teal-900 rounded-full hover:bg-teal-100"><X size={20} /></button>
              <div className="flex items-center gap-3 mb-10"><Settings className="text-primary" size={32} /><h3 className="text-3xl font-black text-teal-950 font-serif uppercase tracking-tight">Admin Portal</h3></div>
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-teal-400 uppercase tracking-widest">Upload Homestay Pics</label>
                  <label className="w-full h-40 border-4 border-dashed border-teal-50 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-teal-50 transition-all group">
                    <Camera className="text-teal-200 group-hover:text-primary mb-2" size={40} />
                    <span className="text-xs font-bold text-teal-900/40 uppercase tracking-widest">Click to Select Photos</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAdminUpload} />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {adminPics.map((url, i) => <img key={i} src={url} className="w-full h-20 object-cover rounded-2xl shadow-sm border border-teal-50" alt="Admin Upload" />)}
                  {adminPics.length === 0 && <div className="col-span-4 py-8 text-center text-teal-900/20 text-[10px] font-black uppercase tracking-[0.3em]">No custom gallery photos yet</div>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Overlay */}
      <AnimatePresence>
        {paymentStep !== 'none' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-teal-950/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] shadow-3xl overflow-hidden relative p-10 md:p-12 text-center">
              <button onClick={() => setPaymentStep('none')} className="absolute top-8 right-8 p-2 bg-teal-50 text-teal-900 rounded-full hover:bg-teal-100"><X size={20} /></button>
              {paymentStep === 'scanning' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center">
                    <QrCode size={32} className="text-primary mb-4" />
                    <h3 className="text-3xl font-black text-teal-950 font-serif uppercase tracking-tight leading-none">Confirm Booking</h3>
                    <p className="text-teal-900/40 font-medium text-xs mt-3 uppercase tracking-widest text-center px-10">Review your selected services and scan to pay</p>
                  </div>

                  {/* Detailed Service Breakdown */}
                  <div className="bg-teal-50/50 rounded-[2rem] p-6 text-left space-y-4 border border-teal-100">
                    <h4 className="text-[10px] font-black text-teal-900/40 uppercase tracking-widest border-b border-teal-100 pb-2">Trip Summary</h4>
                    <div className="space-y-3">
                      {roomNights > 0 && (
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <Home size={14} className="text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-teal-950">Luxury Stay</p>
                              <p className="text-[10px] text-teal-900/40">{roomNights} Nights • {roomBooking.guests} Guests • {roomBooking.roomType}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold">₹{(roomBooking.roomType === 'AC' ? 3500 : 3000) * roomNights}</span>
                        </div>
                      )}
                      
                      {carBooking.active && (
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <Car size={14} className="text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-teal-950">Rental Car</p>
                              <p className="text-[10px] text-teal-900/40">{carBooking.model.toUpperCase()} • {carNights} Days</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold">₹{(CAR_MODELS.find(m => m.id === carBooking.model)?.price || 0) * carNights}</span>
                        </div>
                      )}

                      {boatingBooking.active && (
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <Waves size={14} className="text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-teal-950">Boating Trip</p>
                              <p className="text-[10px] text-teal-900/40">{boatingBooking.duration} Hr • {boatingBooking.timeSlot}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold">₹{boatingBooking.people * 500 * (boatingBooking.duration === '1.5' ? 1.5 : 1)}</span>
                        </div>
                      )}

                      {Object.keys(foodOrder).length > 0 && (
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <UtensilsCrossed size={14} className="text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-teal-950">Coastal Dining</p>
                              <p className="text-[10px] text-teal-900/40">{Object.values(foodOrder).reduce((a, b) => a + b, 0)} Items Selected</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold">₹{Object.entries(foodOrder).reduce((acc, [id, qty]) => acc + (FOOD_MENU.find(m => m.id === id)?.price || 0) * qty, 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-6">
                    <div className="bg-teal-50 p-4 rounded-[2.5rem] inline-block shadow-inner">
                      <QRCodeSVG value={`upi://pay?pa=mahalakshmi@upi&am=${totalCost}&cu=INR`} size={140} />
                    </div>

                    <div className="w-full flex justify-between items-center text-lg font-black p-5 bg-primary text-white rounded-2xl shadow-xl">
                      <span className="text-teal-200 text-sm uppercase tracking-widest">Total to Pay</span>
                      <span>₹{totalCost}</span>
                    </div>

                    <button onClick={handleSimulatePayment} className="w-full py-5 bg-accent text-primary rounded-2xl font-black text-lg shadow-xl shadow-accent/20">Verify & Confirm Paid</button>
                  </div>
                </div>
              )}
              {paymentStep === 'processing' && <div className="py-20 flex flex-col items-center space-y-6"><Loader2 className="w-12 h-12 text-primary animate-spin" /><h3 className="text-2xl font-black text-teal-950 font-serif">Verifying...</h3></div>}
              {paymentStep === 'success' && (
                <div className="space-y-8 animate-in zoom-in duration-500 text-left">
                  <div className="flex flex-col items-center text-center"><div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-200"><CheckCircle2 size={40} /></div><h3 className="text-3xl font-black text-teal-950 font-serif">Trip Finalized!</h3><p className="text-teal-900/40 font-medium text-xs">Details sent to mahalakshmihost@gmail.com</p></div>
                  <div className="bg-white border-2 border-teal-50 rounded-[2.5rem] p-8 space-y-4 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start border-b border-teal-50 pb-4"><div><p className="text-[8px] font-black text-teal-400 uppercase tracking-widest mb-1 text-left">Order No.</p><p className="font-black text-teal-950 text-sm">{orderNumber}</p></div><div className="text-right"><p className="text-[8px] font-black text-teal-400 uppercase tracking-widest mb-1">Status</p><p className="font-black text-emerald-500 text-sm uppercase">Paid</p></div></div>
                    <div className="space-y-2 py-4">
                      {roomNights > 0 && <div className="flex justify-between text-xs text-teal-950/70 font-medium"><span>Luxury Stay</span><span className="font-black">₹{(roomBooking.roomType === 'AC' ? 3500 : 3000) * roomNights}</span></div>}
                      {carBooking.active && <div className="flex justify-between text-xs text-teal-950/70 font-medium"><span>Rental Car</span><span className="font-black">₹{(CAR_MODELS.find(m => m.id === carBooking.model)?.price || 0) * carNights}</span></div>}
                      {boatingBooking.active && <div className="flex justify-between text-xs text-teal-950/70 font-medium"><span>Boating Trip</span><span className="font-black">₹{boatingBooking.people * 500 * (boatingBooking.duration === '1.5' ? 1.5 : 1)}</span></div>}
                    </div>
                    <div className="bg-teal-950 p-5 rounded-2xl flex justify-between items-center text-white"><span className="font-bold text-xs uppercase tracking-widest text-teal-400">Total Paid</span><span className="text-2xl font-black text-accent">₹{totalCost}</span></div>
                  </div>
                  <button onClick={() => setPaymentStep('none')} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-teal-500/20 transition-all">Close</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer id="contact" className="py-32 bg-teal-950 text-white">
        <div className="max-w-7xl mx-auto px-6 text-left">
          <div className="grid md:grid-cols-3 gap-20">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/10"><Waves className="text-primary w-6 h-6" /></div>
                <span className="text-3xl font-black font-serif tracking-tighter uppercase">Maha Coastal</span>
              </div>
              <p className="text-teal-100/40 font-medium leading-relaxed">Redefining coastal hospitality through traditional values and modern luxury.</p>
              <div className="flex flex-col gap-4">
                <a href="mailto:mahalakshmihost@gmail.com" className="p-3 bg-white/5 rounded-2xl text-accent hover:bg-accent hover:text-teal-950 transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"><Mail size={14} /> mahalakshmihost@gmail.com</a>
              </div>
            </div>
            <div className="space-y-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Contact Details</h4>
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5"><Phone className="text-accent" size={20} /></div>
                  <div><p className="text-[8px] uppercase font-black text-teal-500 tracking-widest mb-1">Stay Inquiry</p><p className="font-bold text-lg">+91 8431232860</p></div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5"><Phone className="text-accent" size={20} /></div>
                  <div><p className="text-[8px] uppercase font-black text-teal-500 tracking-widest mb-1">General Info</p><p className="font-bold text-lg">+91 8105934576</p></div>
                </div>
              </div>
            </div>
            <div className="space-y-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent text-left">Location</h4>
              <p className="text-teal-100/40 font-serif italic text-lg leading-relaxed text-left">"Find us nestled between the serene backwaters and the roaring Arabian Sea."</p>
              <a href="https://maps.app.goo.gl/wzTkRPYoYqFgVUkw6" target="_blank" className="inline-flex items-center gap-3 text-accent font-black uppercase text-[10px] tracking-widest hover:translate-x-2 transition-all"><MapPin size={16} /> Open in Google Maps <ArrowRight size={14} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
