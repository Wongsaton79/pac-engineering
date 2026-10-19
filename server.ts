import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Calculate fallback calculation if AI key not present or offline
function generateFallbackOptimization(params: any) {
  const distance = Math.max(1, Number(params.distanceKm) || 15);
  const now = new Date();
  const hour = now.getHours();
  const isMorningPeak = hour >= 7 && hour <= 9;
  const isEveningPeak = hour >= 16 && hour <= 19;
  
  let speedKmH = 35;
  let trafficLevel: 'smooth' | 'moderate' | 'heavy' | 'severe' = 'moderate';
  let trafficAssessment = 'การจราจรในเขตกรุงเทพฯ และปริมณฑลคล่องตัวปานกลาง เคลื่อนตัวได้ตามรอบสัญญาณไฟ';
  
  if (isMorningPeak || isEveningPeak) {
    speedKmH = 22;
    trafficLevel = 'heavy';
    trafficAssessment = `ช่วงเวลาเร่งด่วน (${isMorningPeak ? 'เช้า' : 'เย็น'}) มีปริมาณรถสะสมหนาแน่นบริเวณจุดตัดทางด่วนและแนวถนนสายหลัก`;
  } else if (hour >= 21 || hour <= 6) {
    speedKmH = 50;
    trafficLevel = 'smooth';
    trafficAssessment = 'การจราจรคล่องตัวสูง ถนนโล่ง สามารถทำความเร็วเฉลี่ยได้ดี';
  }

  const durationMin = Math.round((distance / speedKmH) * 60);
  const fuelRateKmPerL = 11.5; // Commercial pickup truck
  const fuelLiters = Number((distance / fuelRateKmPerL).toFixed(1));
  const dieselPricePerL = 33.5;
  const fuelCost = Math.round(fuelLiters * dieselPricePerL);

  return {
    trafficLevel,
    trafficAssessmentTh: trafficAssessment,
    estimatedDurationMin: durationMin,
    distanceKm: Number(distance.toFixed(1)),
    fuelConsumptionLiters: fuelLiters,
    estimatedFuelCostThb: fuelCost,
    recommendedDepartureTime: isMorningPeak 
      ? 'ควรออกเดินทางทันที หรือชะลอเป็นหลัง 09:30 น. เพื่อเลี่ยงคอขวด'
      : isEveningPeak 
      ? 'ควรวางแผนก่อน 16:00 หรือหลัง 19:30 น.' 
      : 'เวลาปัจจุบันเหมาะสม สามารถออกเดินทางได้ทันที',
    bestRoute: {
      name: 'ทางพิเศษหลัก / ทางด่วนเชื่อมต่อตรงสู่หน้างาน (แนะนำ)',
      description: `เดินทางจากจุดปัจจุบันมุ่งหน้า ${params.destinationName || 'หน้างาน'} ผ่านทางด่วนสายหลัก`,
      pros: 'คุมเวลาได้แน่นอนที่สุด เลี่ยงแยกไฟแดงและชุมชนหนาแน่น',
      cons: 'มีค่าผ่านทางด่วนประมาณ 50 - 65 บาท',
      tollFeeBaht: 60,
      durationMin: Math.max(15, Math.round(durationMin * 0.75))
    },
    alternativeRoute: {
      name: 'เส้นทางราบสายเลี่ยงเมือง / ถนนวงแหวน (เน้นประหยัด)',
      description: `ใช้เส้นทางราบและถนนสายรองมุ่งหน้า ${params.destinationAddress || 'จุดหมาย'}`,
      pros: 'ไม่มีค่าผ่านทางพิเศษ ประหยัดต้นทุนเชื้อเพลิงและค่าเดินทาง',
      cons: 'อาจติดสัญญาณไฟจราจรหลายจุดในชั่วโมงเร่งด่วน',
      tollFeeBaht: 0,
      durationMin: Math.round(durationMin * 1.15)
    },
    ecoFuelSavingAdvice: [
      'รักษาความเร็วคงที่ 70-80 กม./ชม. และหลีกเลี่ยงการเร่งแซงกะทันหัน ช่วยประหยัดน้ำมันได้ถึง 15-20%',
      'ตรวจสอบลมยางรถช่างบรรทุกเครื่องปรับอากาศ/Heat pump ให้อยู่ในเกณฑ์ 38-40 PSI',
      'วางแผนรวมรอบรับอะไหล่และอุปกรณ์ติดตั้งในเที่ยวเดียวเพื่อลดระยะทางวิ่งซ้ำซ้อน'
    ],
    safetyAndWorkSiteNote: 'โปรดยึดโยงถังไนโตรเจน ถังน้ำยาทำความเย็น และตัวเครื่องให้แน่นหนาก่อนเคลื่อนย้าย'
  };
}

// POST endpoint for AI Travel & Route Optimization
app.post('/api/analyze-travel', async (req, res) => {
  try {
    const {
      originCoords,
      originAddress,
      destinationCoords,
      destinationName,
      destinationAddress,
      currentTime,
      distanceKm,
      vehicleType
    } = req.body;

    const fallbackResult = generateFallbackOptimization({
      originCoords,
      destinationCoords,
      destinationName,
      destinationAddress,
      distanceKm
    });

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set, returning algorithmic route optimization.');
      return res.json(fallbackResult);
    }

    const prompt = `
คุณเป็นระบบ AI ผู้เชี่ยวชาญด้านการวางแผนเส้นทางและโลจิสติกส์การเดินทางสำหรับช่างและวิศวกรของบริษัท "PAC Engineering Service" (ผู้นำด้านระบบ Heat Pump ประหยัดพลังงานและเครื่องปรับอากาศอุตสาหกรรมในประเทศไทย)

กรุณาวิเคราะห์เส้นทางการเดินทางจริงจากพิกัดต้นทางไปยังพิกัดหน้างานของลูกค้า:
- พิกัดต้นทาง (จุดปัจจุบันของช่าง): Lat ${originCoords?.lat}, Lng ${originCoords?.lng} (${originAddress || 'ตำแหน่ง GPS ปัจจุบัน'})
- พิกัดหน้างานปลายทาง: Lat ${destinationCoords?.lat}, Lng ${destinationCoords?.lng}
- ชื่องาน/สถานที่หน้างาน: "${destinationName || 'โครงการลูกค้า'}"
- ที่อยู่หน้างาน: "${destinationAddress || 'กรุงเทพมหานคร'}"
- ระยะทางโดยตรงโดยประมาณ: ${distanceKm || 15} กิโลเมตร
- ประเภทรถ: ${vehicleType || 'รถกระบะขนส่งอุปกรณ์ช่างและอะไหล่ (ดีเซล)'}
- เวลาปัจจุบัน: ${currentTime || new Date().toLocaleTimeString('th-TH')}

กรุณาวิเคราะห์สภาพการจราจรในกรุงเทพฯ และปริมณฑลตามเวลาจริง เส้นทางลัด เลี่ยงทางก่อสร้าง ประเมินการประหยัดเวลาและน้ำมัน (ราคาน้ำมันดีเซลประมาณ 33.50 บาท/ลิตร, อัตรากินน้ำมันรถกระบะขนของ 11 กม./ลิตร)
ตอบกลับเป็น JSON เท่านั้น ตามโครงสร้างดังนี้:
{
  "trafficLevel": "smooth" | "moderate" | "heavy" | "severe",
  "trafficAssessmentTh": "สรุปสภาพการจราจรและสถานการณ์ล่าสุดเป็นภาษาไทยสั้นกระชับ",
  "estimatedDurationMin": ตัวเลขเวลาเดินทางนาที,
  "distanceKm": ตัวเลขระยะทางถนนจริงกิโลเมตร,
  "fuelConsumptionLiters": ตัวเลขปริมาณน้ำมันลิตร,
  "estimatedFuelCostThb": ตัวเลขค่าน้ำมันบาท,
  "recommendedDepartureTime": "คำแนะนำเวลาออกเดินทางที่ดีที่สุด",
  "bestRoute": {
    "name": "ชื่อเส้นทางหลักที่แนะนำ (เช่น ทางด่วน/ทางหลัก)",
    "description": "แนวเส้นทางที่ควรวิ่ง",
    "pros": "ข้อดี",
    "cons": "ข้อควรระวังหรือจุดติดขัด",
    "tollFeeBaht": ตัวเลขค่าทางด่วนบาท,
    "durationMin": ตัวเลขนาที
  },
  "alternativeRoute": {
    "name": "เส้นทางเลือก (ทางราบ/ทางเลี่ยงเมือง)",
    "description": "แนวเส้นทาง",
    "pros": "ข้อดี",
    "cons": "ข้อเสีย",
    "tollFeeBaht": 0,
    "durationMin": ตัวเลขนาที
  },
  "ecoFuelSavingAdvice": [
    "เทคนิคการขับขี่ประหยัดน้ำมันสำหรับช่างข้อที่ 1",
    "เทคนิคข้อที่ 2",
    "เทคนิคข้อที่ 3"
  ],
  "safetyAndWorkSiteNote": "คำแนะนำความปลอดภัยในการขนอุปกรณ์ช่างและแอร์/ฮีทปั๊ม"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      return res.json(fallbackResult);
    }

    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch {
      return res.json(fallbackResult);
    }
  } catch (err: any) {
    console.error('Error in /api/analyze-travel:', err?.message || err);
    const fallback = generateFallbackOptimization(req.body);
    return res.json(fallback);
  }
});

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
