/**
 * Realistic football stadium layout with SVG polygon sections.
 * viewBox: 0 0 400 350
 * Pitch center: ~200,175
 */

const STADIUM_SECTIONS = [
  // ─── LOWER TIER (closest to pitch) ───
  // North End
  {
    sectionId: '101',
    category: 'category2',
    label: '101',
    color: '#FF6B6B',
    polygon: 'M140,60 L260,60 L270,90 L130,90 Z',
    labelX: 200, labelY: 78,
    rows: ['A', 'B', 'C', 'D'],
    totalSeats: 400,
  },
  {
    sectionId: '102',
    category: 'category2',
    label: '102',
    color: '#FF6B6B',
    polygon: 'M100,70 L140,60 L130,90 L90,100 Z',
    labelX: 115, labelY: 80,
    rows: ['A', 'B', 'C', 'D'],
    totalSeats: 320,
  },
  {
    sectionId: '103',
    category: 'category2',
    label: '103',
    color: '#FF6B6B',
    polygon: 'M260,60 L300,70 L310,100 L270,90 Z',
    labelX: 285, labelY: 80,
    rows: ['A', 'B', 'C', 'D'],
    totalSeats: 320,
  },

  // West Stand (left side)
  {
    sectionId: '104',
    category: 'category3',
    label: '104',
    color: '#A29BFE',
    polygon: 'M60,100 L90,100 L80,170 L50,170 Z',
    labelX: 70, labelY: 135,
    rows: ['A', 'B', 'C', 'D', 'E'],
    totalSeats: 500,
  },
  {
    sectionId: '105',
    category: 'category3',
    label: '105',
    color: '#A29BFE',
    polygon: 'M50,170 L80,170 L70,240 L40,240 Z',
    labelX: 60, labelY: 205,
    rows: ['A', 'B', 'C', 'D', 'E'],
    totalSeats: 500,
  },

  // East Stand (right side)
  {
    sectionId: '106',
    category: 'category3',
    label: '106',
    color: '#A29BFE',
    polygon: 'M310,100 L340,100 L350,170 L320,170 Z',
    labelX: 330, labelY: 135,
    rows: ['A', 'B', 'C', 'D', 'E'],
    totalSeats: 500,
  },
  {
    sectionId: '107',
    category: 'category3',
    label: '107',
    color: '#A29BFE',
    polygon: 'M320,170 L350,170 L360,240 L330,240 Z',
    labelX: 340, labelY: 205,
    rows: ['A', 'B', 'C', 'D', 'E'],
    totalSeats: 500,
  },

  // South End (behind goal)
  {
    sectionId: '108',
    category: 'category2',
    label: '108',
    color: '#FF6B6B',
    polygon: 'M130,260 L270,260 L260,290 L140,290 Z',
    labelX: 200, labelY: 275,
    rows: ['A', 'B', 'C', 'D'],
    totalSeats: 400,
  },
  {
    sectionId: '109',
    category: 'category2',
    label: '109',
    color: '#FF6B6B',
    polygon: 'M90,250 L130,260 L140,290 L100,290 Z',
    labelX: 115, labelY: 273,
    rows: ['A', 'B', 'C', 'D'],
    totalSeats: 320,
  },
  {
    sectionId: '110',
    category: 'category2',
    label: '110',
    color: '#FF6B6B',
    polygon: 'M270,260 L310,250 L300,290 L260,290 Z',
    labelX: 285, labelY: 273,
    rows: ['A', 'B', 'C', 'D'],
    totalSeats: 320,
  },

  // ─── UPPER TIER ───
  // North Upper
  {
    sectionId: '318',
    category: 'category1',
    label: '318',
    color: '#FFD700',
    polygon: 'M130,30 L270,30 L280,55 L120,55 Z',
    labelX: 200, labelY: 43,
    rows: ['M', 'N', 'O', 'P', 'Q', 'R'],
    totalSeats: 600,
  },

  // West Upper
  {
    sectionId: '319',
    category: 'category1',
    label: '319',
    color: '#FFD700',
    polygon: 'M30,100 L50,100 L40,170 L20,170 Z',
    labelX: 35, labelY: 135,
    rows: ['M', 'N', 'O', 'P', 'Q', 'R'],
    totalSeats: 480,
  },
  {
    sectionId: '320',
    category: 'category1',
    label: '320',
    color: '#FFD700',
    polygon: 'M20,170 L40,170 L30,240 L10,240 Z',
    labelX: 25, labelY: 205,
    rows: ['M', 'N', 'O', 'P', 'Q', 'R'],
    totalSeats: 480,
  },

  // East Upper
  {
    sectionId: '321',
    category: 'category1',
    label: '321',
    color: '#FFD700',
    polygon: 'M350,100 L370,100 L380,170 L360,170 Z',
    labelX: 365, labelY: 135,
    rows: ['M', 'N', 'O', 'P', 'Q', 'R'],
    totalSeats: 480,
  },
  {
    sectionId: '322',
    category: 'category1',
    label: '322',
    color: '#FFD700',
    polygon: 'M360,170 L380,170 L390,240 L370,240 Z',
    labelX: 375, labelY: 205,
    rows: ['M', 'N', 'O', 'P', 'Q', 'R'],
    totalSeats: 480,
  },

  // South Upper
  {
    sectionId: '323',
    category: 'category1',
    label: '323',
    color: '#FFD700',
    polygon: 'M120,300 L280,300 L270,325 L130,325 Z',
    labelX: 200, labelY: 313,
    rows: ['M', 'N', 'O', 'P', 'Q', 'R'],
    totalSeats: 600,
  },

  // ─── CORNER SECTIONS ───
  {
    sectionId: '201',
    category: 'category4',
    label: '201',
    color: '#EF5350',
    polygon: 'M90,80 L120,60 L120,90 L80,100 Z',
    labelX: 100, labelY: 82,
    rows: ['A', 'B', 'C'],
    totalSeats: 180,
  },
  {
    sectionId: '202',
    category: 'category4',
    label: '202',
    color: '#EF5350',
    polygon: 'M280,60 L310,80 L320,100 L280,90 Z',
    labelX: 298, labelY: 82,
    rows: ['A', 'B', 'C'],
    totalSeats: 180,
  },
  {
    sectionId: '203',
    category: 'category4',
    label: '203',
    color: '#EF5350',
    polygon: 'M80,250 L120,260 L120,290 L90,290 Z',
    labelX: 100, labelY: 273,
    rows: ['A', 'B', 'C'],
    totalSeats: 180,
  },
  {
    sectionId: '204',
    category: 'category4',
    label: '204',
    color: '#EF5350',
    polygon: 'M280,260 L320,250 L310,290 L280,290 Z',
    labelX: 298, labelY: 273,
    rows: ['A', 'B', 'C'],
    totalSeats: 180,
  },

  // ─── VIP BOXES ───
  {
    sectionId: 'VIP1',
    category: 'vip',
    label: 'VIP 1',
    color: '#FFB300',
    polygon: 'M50,140 L80,140 L80,200 L50,200 Z',
    labelX: 65, labelY: 173,
    rows: ['V1', 'V2'],
    totalSeats: 40,
  },
  {
    sectionId: 'VIP2',
    category: 'vip',
    label: 'VIP 2',
    color: '#FFB300',
    polygon: 'M320,140 L350,140 L350,200 L320,200 Z',
    labelX: 335, labelY: 173,
    rows: ['V1', 'V2'],
    totalSeats: 40,
  },

  // ─── SUPPORTERS TIER ───
  {
    sectionId: 'SUP1',
    category: 'supporters',
    label: 'Supporters',
    color: '#81C784',
    polygon: 'M140,15 L260,15 L270,28 L130,28 Z',
    labelX: 200, labelY: 22,
    rows: ['S1', 'S2'],
    totalSeats: 240,
  },
  {
    sectionId: 'SUP2',
    category: 'supporters',
    label: 'Supporters',
    color: '#81C784',
    polygon: 'M130,327 L270,327 L260,340 L140,340 Z',
    labelX: 200, labelY: 334,
    rows: ['S1', 'S2'],
    totalSeats: 240,
  },
];

module.exports = { STADIUM_SECTIONS };
