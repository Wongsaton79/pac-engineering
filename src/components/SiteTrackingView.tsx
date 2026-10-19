import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps';
import {
  SystemDatabase,
  User,
  Quotation,
  SiteCheckIn,
  SiteLocation,
  CheckInActionType
} from '../types';
import { calculateDistanceMeters, formatDistance } from '../utils/geoUtils';
import { thaiToday } from '../utils/formatters';
import {
  MapPin,
  Camera,
  Navigation,
  Compass,
  Sparkles,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Fuel,
  TrendingDown,
  Car,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Phone,
  Maximize2,
  X
} from 'lucide-react';

interface SiteTrackingViewProps {
  db: SystemDatabase;
  currentUser: User | null;
  onUpdateDb: (updater: (prev: SystemDatabase) => SystemDatabase) => void;
  onLog: (action: string, category: any, target: string, details: string) => void;
}

const GOOGLE_MAPS_API_KEY =
  ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyBHKv3aGeIdsKJd-VL3UEglcFXLH34Vmm8';

// PAC Headquarters default coordinates (Ramintra 65, Bangkok)
const PAC_HQ_COORDS = { lat: 13.8542, lng: 100.6473 };

export const SiteTrackingView: React.FC<SiteTrackingViewProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onLog
}) => {
  // Navigation sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'checkin' | 'ai_route' | 'history'>('map');

  // Technician Current GPS Location
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>('');

  // Selected site / marker for InfoWindow & Route Planning
  const [selectedSiteUid, setSelectedSiteUid] = useState<string>(
    db.quotations.length ? db.quotations[0].uid : ''
  );
  const [activeMarkerInfo, setActiveMarkerInfo] = useState<{
    type: 'site' | 'checkin' | 'user';
    id: string;
    title: string;
    address: string;
    lat: number;
    lng: number;
    photoUrl?: string;
    extra?: string;
  } | null>(null);

  // Check-in form state
  const [checkInSiteUid, setCheckInSiteUid] = useState<string>(
    db.quotations.length ? db.quotations[0].uid : ''
  );
  const [checkInActionType, setCheckInActionType] = useState<CheckInActionType>('check_in');
  const [checkInNote, setCheckInNote] = useState<string>('');
  const [checkInPhoto, setCheckInPhoto] = useState<string>('');
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState<boolean>(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Route Analysis State
  const [aiSelectedSiteUid, setAiSelectedSiteUid] = useState<string>(
    db.quotations.length ? db.quotations[0].uid : ''
  );
  const [vehicleType, setVehicleType] = useState<string>('รถกระบะขนส่งอุปกรณ์ PAC (ดีเซล)');
  const [isAnalyzingRoute, setIsAnalyzingRoute] = useState<boolean>(false);
  const [aiRouteResult, setAiRouteResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string>('');

  // Photo modal preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Auto-request GPS position on component mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('อุปกรณ์หรือเบราว์เซอร์ไม่รองรับ Geolocation');
      return;
    }
    setIsLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocationError('ไม่สามารถดึงตำแหน่ง GPS ได้ (ใช้พิกัดสำนักงานใหญ่ PAC รามอินทรา)');
        // Fallback to PAC HQ for demo
        setUserCoords({
          lat: PAC_HQ_COORDS.lat,
          lng: PAC_HQ_COORDS.lng,
          accuracy: 25
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Current selected Quotation / Project Site
  const selectedQuote = db.quotations.find((q) => q.uid === selectedSiteUid) || db.quotations[0];
  const checkInQuote = db.quotations.find((q) => q.uid === checkInSiteUid) || db.quotations[0];
  const aiQuote = db.quotations.find((q) => q.uid === aiSelectedSiteUid) || db.quotations[0];

  // Calculate geofence distance for current check-in selection
  const checkInSiteCoords = checkInQuote?.siteLocation
    ? { lat: checkInQuote.siteLocation.lat, lng: checkInQuote.siteLocation.lng }
    : { lat: 13.6931, lng: 100.5052 };

  const currentDistanceMeters = userCoords
    ? calculateDistanceMeters(
        userCoords.lat,
        userCoords.lng,
        checkInSiteCoords.lat,
        checkInSiteCoords.lng
      )
    : 0;

  const isWithinGeofence = currentDistanceMeters <= 500;

  // Handle Photo Capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCheckInPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Check-in
  const handleSubmitCheckIn = () => {
    if (!checkInPhoto) {
      alert('กรุณาถ่ายรูปหน้างานเพื่อยืนยันการเช็คอิน');
      return;
    }
    if (!userCoords) {
      alert('กรุณารอการระบุพิกัด GPS ก่อนบันทึกเช็คอิน');
      return;
    }

    setIsSubmittingCheckIn(true);

    const now = new Date();
    const thaiDateTime = `${thaiToday()} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

    const newCheckIn: SiteCheckIn = {
      id: `chk-${Date.now()}`,
      jobRefId: checkInQuote.uid,
      jobTitle: checkInQuote.project?.line1 || checkInQuote.customer?.company || 'โครงการหน้างาน PAC',
      customerName: checkInQuote.customer?.attn || checkInQuote.customer?.company || 'ลูกค้า PAC',
      technicianUsername: currentUser?.username || 'technician',
      technicianName: currentUser?.name || 'ช่างเทคนิค PAC',
      timestamp: thaiDateTime,
      isoTimestamp: now.toISOString(),
      photoUrl: checkInPhoto,
      coords: {
        lat: userCoords.lat,
        lng: userCoords.lng,
        accuracy: userCoords.accuracy
      },
      siteCoords: {
        lat: checkInSiteCoords.lat,
        lng: checkInSiteCoords.lng
      },
      locationAddress: checkInQuote.siteLocation?.address || checkInQuote.customer?.addr1 || 'กรุงเทพมหานคร',
      distanceFromSiteMeters: currentDistanceMeters,
      isWithinGeofence,
      note: checkInNote || (checkInActionType === 'check_in' ? 'เดินทางถึงหน้างานและเริ่มงาน' : 'บันทึกสถานะงานหน้างาน'),
      actionType: checkInActionType
    };

    onUpdateDb((prev) => ({
      ...prev,
      checkIns: [newCheckIn, ...prev.checkIns]
    }));

    onLog(
      `เช็คอินหน้างาน [${checkInActionType}]`,
      'INSTALL',
      checkInQuote.meta?.quoteNo || checkInQuote.uid,
      `พนักงาน: ${newCheckIn.technicianName} | ระยะห่าง: ${formatDistance(currentDistanceMeters)} | บันทึก: ${newCheckIn.note}`
    );

    setIsSubmittingCheckIn(false);
    setCheckInSuccessMsg('บันทึกเช็คอินพร้อมรูปถ่ายและพิกัด GPS เรียบร้อยแล้ว!');
    setCheckInNote('');
    setCheckInPhoto('');

    setTimeout(() => {
      setCheckInSuccessMsg('');
      setActiveSubTab('history');
    }, 1800);
  };

  // Run AI Route Optimization
  const handleRunAiAnalysis = async () => {
    if (!aiQuote) return;
    setIsAnalyzingRoute(true);
    setAiError('');

    const origin = userCoords || PAC_HQ_COORDS;
    const dest = aiQuote.siteLocation || {
      name: aiQuote.project?.line1 || 'หน้างานลูกค้า',
      address: aiQuote.customer?.addr1 || 'กรุงเทพฯ',
      lat: 13.6931,
      lng: 100.5052
    };

    const directDistKm = Number(
      (calculateDistanceMeters(origin.lat, origin.lng, dest.lat, dest.lng) / 1000).toFixed(1)
    );

    try {
      const res = await fetch('/api/analyze-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originCoords: origin,
          originAddress: userCoords ? 'พิกัด GPS ปัจจุบันของผู้เปิดระบบ' : 'สำนักงานใหญ่ PAC รามอินทรา',
          destinationCoords: { lat: dest.lat, lng: dest.lng },
          destinationName: dest.name,
          destinationAddress: dest.address,
          currentTime: `${new Date().toLocaleTimeString('th-TH')} น.`,
          distanceKm: directDistKm,
          vehicleType
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      setAiRouteResult(data);
    } catch (err: any) {
      console.warn('API error, using client-side route optimization:', err);
      // Fallback calculation directly
      setAiRouteResult({
        trafficLevel: 'moderate',
        trafficAssessmentTh: 'สภาพการจราจรโดยรวมเคลื่อนตัวได้ช้าในบางช่วงแยกไฟแดงหลัก',
        estimatedDurationMin: Math.max(20, Math.round(directDistKm * 2.2)),
        distanceKm: Math.round(directDistKm * 1.3),
        fuelConsumptionLiters: Number(((directDistKm * 1.3) / 11).toFixed(1)),
        estimatedFuelCostThb: Math.round(((directDistKm * 1.3) / 11) * 33.5),
        recommendedDepartureTime: 'ออกเดินทางทันที หรือหลีกเลี่ยงช่วง 16:30-19:00 น.',
        bestRoute: {
          name: 'ทางพิเศษหลัก / ด่วนฉลองรัช (แนะนำ)',
          description: `มุ่งหน้าสู่ ${dest.name} ผ่านทางด่วนสายหลัก`,
          pros: 'เวลาแน่นอน เลี่ยงสัญญาณไฟแดง',
          cons: 'มีค่าผ่านทางพิเศษประมาณ 50-60 บาท',
          tollFeeBaht: 50,
          durationMin: Math.max(18, Math.round(directDistKm * 1.8))
        },
        alternativeRoute: {
          name: 'เส้นทางราบ (ประหยัดค่าทางด่วน)',
          description: `วิ่งตามแนวถนนสายหลักและซอยลัด`,
          pros: 'ฟรีค่าผ่านทาง ประหยัดงบประมาณ',
          cons: 'อาจติดขัดสะสมบริเวณแยกไฟแดง',
          tollFeeBaht: 0,
          durationMin: Math.round(directDistKm * 2.6)
        },
        ecoFuelSavingAdvice: [
          'ใช้ความเร็วสม่ำเสมอ 70-80 กม./ชม. ช่วยประหยัดน้ำมัน 15%',
          'ตรวจเช็คลมยางรถช่างให้อยู่ที่ 38 PSI ก่อนออกเดินทาง',
          'ดับเครื่องยนต์ขณะขนถ่ายสินค้าหน้างานเกิน 3 นาที'
        ],
        safetyAndWorkSiteNote: 'ยึดโยงอุปกรณ์และถังน้ำยา R410A / R32 ให้แน่นหนาก่อนออกเดินทาง'
      });
    } finally {
      setIsAnalyzingRoute(false);
    }
  };

  // Helper to open Google Maps turn-by-turn navigation
  const openGoogleMapsNavigation = (destLat: number, destLng: number) => {
    const origin = userCoords
      ? `${userCoords.lat},${userCoords.lng}`
      : `${PAC_HQ_COORDS.lat},${PAC_HQ_COORDS.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destLat},${destLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <MapPin className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-gray-900">
                ระบบพิกัดหน้างาน & เช็คอิน GPS (Site Tracking & Check-in)
              </h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              จัดพิกัดหน้างานบน Google Maps, ถ่ายรูปเช็คอินเข้างานของช่างแบบ Real-time พร้อม AI วิเคราะห์เส้นทางประหยัดน้ำมัน
            </p>
          </div>

          {/* Quick stats and GPS status */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{isLocating ? 'กำลังค้นหา GPS...' : 'อัปเดต GPS ปัจจุบัน'}</span>
            </button>

            {userCoords && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                GPS: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)} (±{userCoords.accuracy || 10}ม.)
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-gray-100">
          <button
            onClick={() => setActiveSubTab('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'map'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>แผนที่พิกัดหน้างาน (Google Maps)</span>
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-white/20">
              {db.quotations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('checkin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'checkin'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>ถ่ายรูป Check-in หน้างาน (ช่าง)</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('ai_route');
              if (!aiRouteResult) handleRunAiAnalysis();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'ai_route'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI วิเคราะห์การเดินทาง & ค่าน้ำมัน</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>ประวัติภาพถ่ายหน้างาน (Audit)</span>
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
              {db.checkIns?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: GOOGLE MAPS INTERACTIVE VIEW */}
      {activeSubTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map Canvas */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-semibold text-gray-900">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  จุดโครงการ PAC ({db.quotations.length})
                </span>
                <span className="flex items-center gap-1 font-semibold text-gray-900">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                  พิกัดปัจจุบัน
                </span>
                <span className="flex items-center gap-1 font-semibold text-gray-900">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
                  จุดเช็คอิน ({db.checkIns?.length || 0})
                </span>
              </div>
              <span className="text-gray-400">Google Maps Platform</span>
            </div>

            <div className="relative flex-1 w-full h-full">
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                  id="pac-site-tracking-map"
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  defaultCenter={
                    selectedQuote?.siteLocation
                      ? { lat: selectedQuote.siteLocation.lat, lng: selectedQuote.siteLocation.lng }
                      : { lat: 13.7367, lng: 100.5231 }
                  }
                  defaultZoom={12}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  style={{ width: '100%', height: '100%' }}
                >
                  {/* Current User Location Marker */}
                  {userCoords && (
                    <AdvancedMarker
                      position={{ lat: userCoords.lat, lng: userCoords.lng }}
                      title="ตำแหน่งปัจจุบันของคุณ"
                      onClick={() =>
                        setActiveMarkerInfo({
                          type: 'user',
                          id: 'user-current',
                          title: 'ตำแหน่ง GPS ปัจจุบันของคุณ',
                          address: `ความแม่นยำ: ±${userCoords.accuracy || 10} เมตร`,
                          lat: userCoords.lat,
                          lng: userCoords.lng
                        })
                      }
                    >
                      <Pin
                        background="#2563eb"
                        borderColor="#1d4ed8"
                        glyphColor="#ffffff"
                      />
                    </AdvancedMarker>
                  )}

                  {/* Project Site Markers */}
                  {db.quotations.map((q) => {
                    const loc = q.siteLocation || {
                      lat: 13.6931,
                      lng: 100.5052,
                      name: q.project?.line1 || 'หน้างาน',
                      address: q.customer?.addr1 || ''
                    };
                    const isSelected = q.uid === selectedSiteUid;

                    return (
                      <AdvancedMarker
                        key={`site-${q.uid}`}
                        position={{ lat: loc.lat, lng: loc.lng }}
                        title={loc.name}
                        onClick={() => {
                          setSelectedSiteUid(q.uid);
                          setActiveMarkerInfo({
                            type: 'site',
                            id: q.uid,
                            title: loc.name,
                            address: loc.address,
                            lat: loc.lat,
                            lng: loc.lng,
                            extra: `ลูกค้า: ${q.customer?.attn || q.customer?.company} | โทร: ${q.customer?.tel || '-'}`
                          });
                        }}
                      >
                        <Pin
                          background={isSelected ? '#059669' : '#ea580c'}
                          borderColor={isSelected ? '#047857' : '#c2410c'}
                          glyphColor="#ffffff"
                          scale={isSelected ? 1.25 : 1.0}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {/* Check-in Markers */}
                  {db.checkIns?.map((chk) => (
                    <AdvancedMarker
                      key={`chk-marker-${chk.id}`}
                      position={{ lat: chk.coords.lat, lng: chk.coords.lng }}
                      title={`เช็คอิน: ${chk.technicianName}`}
                      onClick={() =>
                        setActiveMarkerInfo({
                          type: 'checkin',
                          id: chk.id,
                          title: `เช็คอิน: ${chk.technicianName}`,
                          address: chk.locationAddress,
                          lat: chk.coords.lat,
                          lng: chk.coords.lng,
                          photoUrl: chk.photoUrl,
                          extra: `เวลา: ${chk.timestamp} | ${chk.note}`
                        })
                      }
                    >
                      <Pin
                        background="#9333ea"
                        borderColor="#7e22ce"
                        glyphColor="#ffffff"
                        scale={0.9}
                      />
                    </AdvancedMarker>
                  ))}

                  {/* Active InfoWindow */}
                  {activeMarkerInfo && (
                    <InfoWindow
                      position={{ lat: activeMarkerInfo.lat, lng: activeMarkerInfo.lng }}
                      onCloseClick={() => setActiveMarkerInfo(null)}
                    >
                      <div className="p-2 max-w-xs text-gray-800">
                        {activeMarkerInfo.photoUrl && (
                          <img
                            src={activeMarkerInfo.photoUrl}
                            alt="หน้างาน"
                            className="w-full h-28 object-cover rounded-md mb-2 cursor-pointer"
                            onClick={() => setPreviewPhotoUrl(activeMarkerInfo.photoUrl!)}
                          />
                        )}
                        <h4 className="font-bold text-sm text-gray-900 leading-snug">
                          {activeMarkerInfo.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {activeMarkerInfo.address}
                        </p>
                        {activeMarkerInfo.extra && (
                          <p className="text-xs text-emerald-700 font-medium mt-1">
                            {activeMarkerInfo.extra}
                          </p>
                        )}

                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => openGoogleMapsNavigation(activeMarkerInfo.lat, activeMarkerInfo.lng)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                          >
                            <Navigation className="w-3 h-3" />
                            นำทาง (GPS)
                          </button>

                          {activeMarkerInfo.type === 'site' && (
                            <button
                              onClick={() => {
                                setCheckInSiteUid(activeMarkerInfo.id);
                                setActiveSubTab('checkin');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                            >
                              <Camera className="w-3 h-3" />
                              เช็คอินจุดนี้
                            </button>
                          )}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>
          </div>

          {/* Right Panel: Project Site List & Actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>รายชื่อหน้างานโครงการ ({db.quotations.length})</span>
              </h3>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {db.quotations.map((q) => {
                  const loc = q.siteLocation || {
                    lat: 13.6931,
                    lng: 100.5052,
                    name: q.project?.line1 || 'หน้างานโครงการ',
                    address: q.customer?.addr1 || 'กรุงเทพฯ'
                  };
                  const isSelected = q.uid === selectedSiteUid;
                  const distMeters = userCoords
                    ? calculateDistanceMeters(userCoords.lat, userCoords.lng, loc.lat, loc.lng)
                    : 0;

                  return (
                    <div
                      key={q.uid}
                      onClick={() => setSelectedSiteUid(q.uid)}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {q.meta?.quoteNo || q.uid}
                          </span>
                          <h4 className="font-semibold text-sm text-gray-900 mt-1 line-clamp-1">
                            {loc.name}
                          </h4>
                        </div>
                        {userCoords && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded">
                            {formatDistance(distMeters)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                        {loc.address}
                      </p>

                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {q.customer?.tel || loc.contactPhone || '-'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openGoogleMapsNavigation(loc.lat, loc.lng);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded"
                            title="เปิด Google Maps นำทาง"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAiSelectedSiteUid(q.uid);
                              setActiveSubTab('ai_route');
                              handleRunAiAnalysis();
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                            title="AI วิเคราะห์การเดินทาง"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TECHNICIAN ON-SITE CHECK-IN WITH CAMERA */}
      {activeSubTab === 'checkin' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xs border border-gray-100 p-6">
          <div className="border-b border-gray-100 pb-4 mb-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>บันทึกถ่ายรูป Check-in หน้างาน (สำหรับช่าง/วิศวกร)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              ระบบจะบันทึกพิกัด GPS อัตโนมัติ พร้อมตรวจวัดระยะห่างจริงจากสถานที่ติดตั้งเพื่อความโปร่งใส
            </p>
          </div>

          {checkInSuccessMsg && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{checkInSuccessMsg}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* 1. Select Project Site */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                เลือกโครงการ / หน้างานที่เข้าปฏิบัติงาน
              </label>
              <select
                value={checkInSiteUid}
                onChange={(e) => setCheckInSiteUid(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                {db.quotations.map((q) => (
                  <option key={q.uid} value={q.uid}>
                    {q.meta?.quoteNo} - {q.project?.line1 || q.customer?.company} (
                    {q.siteLocation?.name || 'กรุงเทพฯ'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Geofence & GPS Status Banner */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                isWithinGeofence
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {isWithinGeofence ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    {isWithinGeofence
                      ? '✓ อยู่ในรัศมีหน้างาน (Geofence Verified)'
                      : '⚠️ พิกัดอยู่นอกรัศมีหน้างาน'}
                  </span>
                  <span className="font-semibold px-2 py-0.5 rounded bg-white/80">
                    ห่าง {formatDistance(currentDistanceMeters)}
                  </span>
                </div>
                <p className="mt-1 opacity-90">
                  {isWithinGeofence
                    ? 'พิกัด GPS ของอุปกรณ์คุณตรงกับที่ตั้งของโครงการนี้ตามเงื่อนไขความปลอดภัย'
                    : 'คุณอยู่ห่างจากพิกัดหน้างานเกิน 500 เมตร ระบบจะยังคงบันทึกข้อมูลและแนบระยะห่างจริงให้ผู้บริหารตรวจสอบ'}
                </p>
                {userCoords && (
                  <p className="mt-1.5 font-mono text-[11px] opacity-75">
                    พิกัดเครื่อง: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)} (±
                    {userCoords.accuracy || 10} ม.)
                  </p>
                )}
              </div>
            </div>

            {/* 3. Action Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                สถานะการเช็คอิน (Action Type)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'check_in', label: '🚀 เข้าหน้างาน', desc: 'เริ่มงานประจำวัน' },
                  { id: 'in_progress', label: '⚙️ ระหว่างทำงาน', desc: 'ตรวจเช็คอุปกรณ์' },
                  { id: 'check_out', label: '✅ ส่งมอบ/เลิกงาน', desc: 'เสร็จงานเรียบร้อย' }
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setCheckInActionType(act.id as CheckInActionType)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      checkInActionType === act.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <div className="text-sm">{act.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Photo Capture / Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                ถ่ายรูปหน้างาน / อุปกรณ์จริง (ภาพถ่ายจะถูกจัดเก็บในระบบ) *
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {checkInPhoto ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                  <img
                    src={checkInPhoto}
                    alt="ภาพถ่ายหน้างาน"
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white text-gray-800 text-xs font-bold rounded-lg shadow-md hover:bg-gray-100"
                    >
                      ถ่ายรูปใหม่
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckInPhoto('')}
                      className="px-3.5 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-red-700"
                    >
                      ลบรูป
                    </button>
                  </div>
                  {/* Photo Timestamp & Watermark */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs text-white p-2 rounded-lg text-[11px] font-mono flex items-center justify-between">
                    <span>📍 {checkInQuote.siteLocation?.name || 'หน้างาน'}</span>
                    <span>{thaiToday()}</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-gray-50 hover:bg-emerald-50/30"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-gray-800">
                    กดที่นี่เพื่อเปิดกล้องมือถือ หรือเลือกรูปถ่ายหน้างาน
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    รองรับภาพจากกล้องสมาร์ตโฟน (ช่างสามารถถ่ายภาพจุดติดตั้ง หรือเซลฟี่หน้างาน)
                  </p>
                </div>
              )}
            </div>

            {/* 5. Note / Job details */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                บันทึกการทำงาน / หมายเหตุหน้างาน
              </label>
              <textarea
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                placeholder="เช่น เดินทางถึงหน้างานเรียบร้อย, เริ่มทดสอบแรงดันระบบน้ำร้อน Heat Pump, เตรียมส่งมอบงานให้ลูกค้า..."
                rows={3}
                className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitCheckIn}
                disabled={isSubmittingCheckIn || !checkInPhoto}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  !checkInPhoto || isSubmittingCheckIn
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSubmittingCheckIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกข้อมูลลงฐานข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>บันทึก Check-in เข้าสู่ระบบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AI ROUTE & TRAVEL OPTIMIZER */}
      {activeSubTab === 'ai_route' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>AI ผู้ช่วยวิเคราะห์เส้นทาง & คำนวณการประหยัดน้ำมัน (Smart Route AI)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  เทียบพิกัด GPS สดของผู้เปิดระบบกับพิกัดหน้างาน อ้างอิงสภาพจราจร Google Maps เพื่อช่วยประหยัดเวลาและน้ำมันของทีมช่าง
                </p>
              </div>

              <button
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzingRoute}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors shrink-0"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isAnalyzingRoute ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingRoute ? 'AI กำลังคำนวณเส้นทาง...' : 'วิเคราะห์เส้นทางใหม่'}</span>
              </button>
            </div>

            {/* Route Setup Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  จุดหมายปลายทาง (หน้างานโครงการ PAC)
                </label>
                <select
                  value={aiSelectedSiteUid}
                  onChange={(e) => setAiSelectedSiteUid(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {db.quotations.map((q) => (
                    <option key={q.uid} value={q.uid}>
                      {q.meta?.quoteNo} - {q.siteLocation?.name || q.project?.line1}
                    </option>
                  ))}
                </select>
                {aiQuote?.siteLocation && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    📍 {aiQuote.siteLocation.address}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  ประเภทยานพาหนะช่าง
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="รถกระบะขนส่งอุปกรณ์ PAC (ดีเซล 11 กม./ลิตร)">
                    รถกระบะขนส่งอุปกรณ์ช่าง (ดีเซล 11 กม./ลิตร)
                  </option>
                  <option value="รถเก๋ง / รถกระบะ 4 ประตูทีมตรวจรับ (14 กม./ลิตร)">
                    รถตรวจรับงาน / ทีมวิศวกร (14 กม./ลิตร)
                  </option>
                  <option value="รถหกล้อขนเครื่องจักร Heat Pump ขนาดใหญ่ (7 กม./ลิตร)">
                    รถบรรทุกขนเครื่องจักร Heat Pump ขนาดใหญ่ (7 กม./ลิตร)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Analysis Result Display */}
          {isAnalyzingRoute ? (
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-gray-900">
                Gemini AI กำลังวิเคราะห์สภาพการจราจรและคำนวณเส้นทาง...
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                กำลังดึงพิกัดถนนจริง ประเมินระยะทาง อัตราสิ้นเปลืองน้ำมัน และวิเคราะห์เส้นทางที่ดีที่สุดตามช่วงเวลา
              </p>
            </div>
          ) : aiRouteResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Main Insights and Route comparison */}
              <div className="lg:col-span-2 space-y-6">
                {/* Traffic and Key Metrics Card */}
                <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-2xl p-6 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-700/50 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-semibold text-sm text-indigo-200">
                        สรุปสถานะการจราจรแบบ Dynamic
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-mono text-indigo-200">
                      อ้างอิงข้อมูล: Google Maps & Gemini
                    </span>
                  </div>

                  <p className="mt-4 text-base font-medium text-white/95 leading-relaxed">
                    "{aiRouteResult.trafficAssessmentTh}"
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-indigo-700/50">
                    <div>
                      <span className="text-xs text-indigo-300 block">เวลาเดินทางคาดการณ์</span>
                      <span className="text-2xl font-extrabold text-white">
                        ~{aiRouteResult.estimatedDurationMin}
                      </span>
                      <span className="text-xs text-indigo-300 ml-1">นาที</span>
                    </div>

                    <div>
                      <span className="text-xs text-indigo-300 block">ระยะทางถนนจริง</span>
                      <span className="text-2xl font-extrabold text-white">
                        {aiRouteResult.distanceKm}
                      </span>
                      <span className="text-xs text-indigo-300 ml-1">กม.</span>
                    </div>

                    <div>
                      <span className="text-xs text-indigo-300 block">น้ำมันที่คาดว่าจะใช้</span>
                      <span className="text-2xl font-extrabold text-amber-300">
                        {aiRouteResult.fuelConsumptionLiters}
                      </span>
                      <span className="text-xs text-indigo-300 ml-1">ลิตร</span>
                    </div>

                    <div>
                      <span className="text-xs text-indigo-300 block">ประมาณการค่าน้ำมัน</span>
                      <span className="text-2xl font-extrabold text-emerald-300">
                        ฿{aiRouteResult.estimatedFuelCostThb}
                      </span>
                      <span className="text-xs text-indigo-300 ml-1">บาท</span>
                    </div>
                  </div>

                  <div className="mt-5 p-3.5 bg-white/10 backdrop-blur-xs rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{aiRouteResult.recommendedDepartureTime}</span>
                    </div>
                    <button
                      onClick={() =>
                        openGoogleMapsNavigation(
                          aiQuote?.siteLocation?.lat || 13.6931,
                          aiQuote?.siteLocation?.lng || 100.5052
                        )
                      }
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      เปิดนำทาง (Google Maps)
                    </button>
                  </div>
                </div>

                {/* 2 Routes comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Best Route */}
                  {aiRouteResult.bestRoute && (
                    <div className="bg-white rounded-xl shadow-xs border-2 border-emerald-500 p-5 relative">
                      <span className="absolute -top-3 left-4 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                        เส้นทางแนะนำ (เร็วที่สุด)
                      </span>
                      <h4 className="font-bold text-gray-900 text-base mt-2">
                        {aiRouteResult.bestRoute.name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {aiRouteResult.bestRoute.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">
                          ใช้เวลา: ~{aiRouteResult.bestRoute.durationMin} นาที
                        </span>
                        <span className="text-gray-500">
                          ค่าผ่านทาง: ~{aiRouteResult.bestRoute.tollFeeBaht} บาท
                        </span>
                      </div>

                      <div className="mt-3 text-xs space-y-1">
                        <p className="text-emerald-700">✓ {aiRouteResult.bestRoute.pros}</p>
                        <p className="text-amber-700">⚠️ {aiRouteResult.bestRoute.cons}</p>
                      </div>
                    </div>
                  )}

                  {/* Alternative Route */}
                  {aiRouteResult.alternativeRoute && (
                    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 relative">
                      <span className="absolute -top-3 left-4 bg-gray-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                        เส้นทางเลือก (เน้นประหยัด)
                      </span>
                      <h4 className="font-bold text-gray-900 text-base mt-2">
                        {aiRouteResult.alternativeRoute.name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {aiRouteResult.alternativeRoute.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">
                          ใช้เวลา: ~{aiRouteResult.alternativeRoute.durationMin} นาที
                        </span>
                        <span className="text-emerald-600 font-bold">ฟรีค่าทางด่วน</span>
                      </div>

                      <div className="mt-3 text-xs space-y-1">
                        <p className="text-emerald-700">✓ {aiRouteResult.alternativeRoute.pros}</p>
                        <p className="text-amber-700">⚠️ {aiRouteResult.alternativeRoute.cons}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Eco Fuel Saving & Safety Advice */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-3">
                    <Fuel className="w-4 h-4 text-emerald-600" />
                    <span>คำแนะนำขับขี่ประหยัดน้ำมัน (Eco-Driving)</span>
                  </h4>
                  <ul className="space-y-2.5 text-xs text-gray-600">
                    {aiRouteResult.ecoFuelSavingAdvice?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {aiRouteResult.safetyAndWorkSiteNote && (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 mb-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>ความปลอดภัยในการขนย้ายอุปกรณ์</span>
                    </h5>
                    <p className="text-xs text-amber-800">
                      {aiRouteResult.safetyAndWorkSiteNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* SUB-TAB 4: EXECUTIVE PHOTO AUDIT & CHECK-IN HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>ประวัติภาพถ่ายหน้างาน & การเช็คอิน (Audit Log)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                สำหรับผู้บริหารและหัวหน้างาน ตรวจสอบเวลาเข้างาน ภาพถ่ายหน้างานจริง และความถูกต้องของพิกัด GPS
              </p>
            </div>

            <span className="text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg">
              บันทึกทั้งหมด: {db.checkIns?.length || 0} รายการ
            </span>
          </div>

          {!db.checkIns || db.checkIns.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Camera className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">ยังไม่มีประวัติการเช็คอินหน้างาน</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {db.checkIns.map((chk) => (
                <div
                  key={chk.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col hover:border-gray-300 transition-all"
                >
                  {/* Photo with Overlay */}
                  <div className="relative h-48 bg-gray-100 cursor-pointer group" onClick={() => setPreviewPhotoUrl(chk.photoUrl)}>
                    <img
                      src={chk.photoUrl}
                      alt={chk.jobTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs ${
                          chk.actionType === 'check_in'
                            ? 'bg-emerald-600 text-white'
                            : chk.actionType === 'check_out'
                            ? 'bg-blue-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {chk.actionType === 'check_in'
                          ? 'เข้าหน้างาน'
                          : chk.actionType === 'check_out'
                          ? 'ส่งมอบงาน'
                          : 'กำลังปฏิบัติงาน'}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 ${
                          chk.isWithinGeofence
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {chk.isWithinGeofence ? '✓ ตรงพิกัด' : '⚠️ นอกพิกัด'} (ห่าง {formatDistance(chk.distanceFromSiteMeters)})
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span className="font-semibold text-gray-900">{chk.technicianName}</span>
                        <span>{chk.timestamp}</span>
                      </div>

                      <h4 className="font-bold text-sm text-gray-900 line-clamp-1">
                        {chk.jobTitle}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        📍 {chk.locationAddress}
                      </p>

                      {chk.note && (
                        <div className="mt-2.5 p-2 bg-gray-50 rounded-lg text-xs text-gray-700 italic border border-gray-100">
                          "{chk.note}"
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-gray-400">
                        GPS: {chk.coords.lat.toFixed(4)}, {chk.coords.lng.toFixed(4)}
                      </span>
                      <button
                        onClick={() => openGoogleMapsNavigation(chk.coords.lat, chk.coords.lng)}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        ดูบนแผนที่
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo Modal Preview */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhotoUrl}
              alt="ภาพถ่ายหน้างานขนาดเต็ม"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
