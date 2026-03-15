export const REGISTRATION_CATEGORIES = [
  { id:'private',    label:'Private',          description:'KAA 000A — standard private vehicle',   pattern:/^K[A-Z]{2}\s?\d{3}[A-Z]$/, example:'KCA 001X' },
  { id:'government', label:'Government',        description:'GKA 000A / GKB 000A — national govt',  pattern:/^GK[A-Z]\s?\d{3}[A-Z]$/,   example:'GKA 001B' },
  { id:'diplomat',   label:'Diplomat / CD',     description:'29 CD 123H — diplomatic corps',        pattern:/^\d{1,3}\s?CD\s?\d{1,4}[A-Z]?$/, example:'29 CD 123H' },
  { id:'police',     label:'Police / AP',       description:'GK A000A — national police service',   pattern:/^GK\s?[A-Z]\d{3}[A-Z]$/,   example:'GK A001B' },
  { id:'military',   label:'KDF',               description:'KDF 0000 — military vehicles',         pattern:/^KDF\s?\d{4}$/,            example:'KDF 0001' },
  { id:'psv',        label:'PSV (Matatu/Bus)',  description:'T 000 A — public service vehicles',   pattern:/^T\s?\d{3}\s?[A-Z]$/,      example:'T 001 A' },
  { id:'ngo',        label:'NGO / Intl Org',   description:'UN 0000 / IO 0000',                   pattern:/^(UN|IO|EU|AU)\s?\d{3,4}$/, example:'UN 0001' },
  { id:'foreign',    label:'Foreign/Temporary', description:'TZ / UG / ET plates',                 pattern:/^[A-Z]{2,3}\s?\d{3,5}[A-Z]?$/, example:'UG 001' },
  { id:'commercial', label:'Commercial/Truck',  description:'KAA 000A — registered commercial',    pattern:/^K[A-Z]{2}\s?\d{3}[A-Z]$/,  example:'KBZ 001A' },
]
 
export function validatePlate(raw, categoryId) {
  const plate = raw.toUpperCase().trim()
  if (!plate) return { valid: false, error: 'Plate is required' }
  const cat = REGISTRATION_CATEGORIES.find(c => c.id === categoryId)
  if (!cat) return { valid: false, error: 'Select a registration category first' }
  if (cat.pattern.test(plate)) return { valid: true, type: cat.label, plate }
  return { valid: false, error: `Invalid format for ${cat.label}. Expected: ${cat.example}` }
}
 
export function formatPlate(raw) {
  return raw.toUpperCase().replace(/\s+/g, ' ').trim()
}
 
export const PLATE_HINT = 'Enter plate as shown on the vehicle'
 
export const MAKES = [
  'Toyota','Nissan','Mitsubishi','Mazda','Honda','Subaru','Isuzu',
  'Mercedes-Benz','BMW','Volkswagen','Audi','Ford','Chevrolet',
  'Hyundai','Kia','Suzuki','Peugeot','Renault','Land Rover','Jeep',
  'Volvo','Lexus','Scania','Hino','MAN','Tata','Other',
]
 
export const MODELS = {
  Toyota:['Corolla','Fielder','Axio','Premio','Allion','Prius','Aqua','Vitz','Rav4','Harrier','Land Cruiser','Prado','Hilux','Probox','Succeed','Noah','Voxy','Alphard','Hiace','Fortuner','Camry'],
  Nissan:['Note','Tiida','X-Trail','Juke','March','Sunny','Patrol','Navara','Serena','Caravan','Hardbody'],
  Mitsubishi:['Outlander','Pajero','Colt','Galant','Eclipse Cross','L200','Rosa','Delica'],
  Mazda:['Demio','Axela','Atenza','CX-5','CX-3','Premacy','MPV','BT-50'],
  Honda:['Fit','Jazz','Civic','Accord','CR-V','HR-V','Freed','Stream','Stepwgn'],
  Subaru:['Impreza','Legacy','Forester','Outback','XV','WRX'],
  Isuzu:['D-Max','MU-X','ELF','NPR','NQR','Forward','FSR','FVR'],
  'Mercedes-Benz':['C-Class','E-Class','S-Class','GLE','GLC','Sprinter','Actros'],
  BMW:['3 Series','5 Series','7 Series','X3','X5','X6'],
  Volkswagen:['Golf','Polo','Passat','Tiguan','Touareg','Amarok','Crafter'],
  Ford:['Ranger','Everest','Explorer','Focus','Transit'],
  Hyundai:['Tucson','Santa Fe','i10','i20','Elantra','Sonata','H100','County'],
  Kia:['Picanto','Rio','Sportage','Sorento','Carnival'],
  Suzuki:['Alto','Swift','Vitara','Jimny','Ertiga','Carry'],
  Other:['Other'],
}
export const COLORS = [
  'White','Silver','Black','Grey','Dark Grey','Blue','Navy Blue',
  'Red','Maroon','Green','Dark Green','Beige','Gold','Champagne',
  'Orange','Brown','Yellow','Purple','Wine Red','Pearl White',
]
export const YEARS = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, i) => String(new Date().getFullYear() - i)
)
export function getModels(make) { return MODELS[make] || ['Other'] }
 
// Demo vehicles (used only in demo mode — never touches DB)
export const DEMO_VEHICLES = [
  { id:'demo-1', plate:'KCA 001X', make:'Toyota', model:'Fielder', year:2019, color:'Silver', vehicle_status:'moving', lat:-1.2864, lng:36.8172, speed:62, fuel_level:74, heading:45, owner_id:'demo', verification_status:'verified', registration_category:'private' },
  { id:'demo-2', plate:'KBZ 442K', make:'Nissan', model:'X-Trail', year:2020, color:'Black', vehicle_status:'sos', lat:-1.3100, lng:36.8350, speed:0, fuel_level:31, heading:0, owner_id:'demo', verification_status:'verified', registration_category:'private' },
  { id:'demo-3', plate:'GKA 218A', make:'Toyota', model:'Land Cruiser', year:2021, color:'White', vehicle_status:'moving', lat:-1.2700, lng:36.8100, speed:45, fuel_level:88, heading:180, owner_id:'demo', verification_status:'verified', registration_category:'government' },
  { id:'demo-4', plate:'KDD 904C', make:'Subaru', model:'Forester', year:2018, color:'Blue', vehicle_status:'parked', lat:-1.2980, lng:36.8220, speed:0, fuel_level:55, heading:90, owner_id:'demo', verification_status:'verified', registration_category:'private' },
  { id:'demo-5', plate:'T 001 A', make:'Toyota', model:'Hiace', year:2017, color:'White', vehicle_status:'moving', lat:-1.2840, lng:36.8300, speed:38, fuel_level:62, heading:270, owner_id:'demo', verification_status:'verified', registration_category:'psv' },
  { id:'demo-6', plate:'29 CD 45H', make:'Mercedes-Benz', model:'E-Class', year:2022, color:'Black', vehicle_status:'parked', lat:-1.2610, lng:36.8050, speed:0, fuel_level:91, heading:0, owner_id:'demo', verification_status:'verified', registration_category:'diplomat' },
  { id:'demo-7', plate:'KBT 556M', make:'Mazda', model:'Demio', year:2016, color:'Red', vehicle_status:'stalled', lat:-1.3020, lng:36.8400, speed:0, fuel_level:8, heading:0, owner_id:'demo', verification_status:'pending', registration_category:'private' },
  { id:'demo-8', plate:'KDA 119P', make:'Honda', model:'Fit', year:2020, color:'White', vehicle_status:'moving', lat:-1.2750, lng:36.8280, speed:55, fuel_level:49, heading:135, owner_id:'demo', verification_status:'verified', registration_category:'private' },
]
export const DEMO_PROFILE = {
  id:'demo', full_name:'Demo Driver', role:'driver', clearance_level:1, is_active:true,
}
export const DEMO_ADMIN_PROFILE = {
  id:'demo-admin', full_name:'Demo Admin', role:'super_admin', clearance_level:10, is_active:true,
}
