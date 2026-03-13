export const MAKES = [
  'Toyota','Nissan','Mitsubishi','Mazda','Honda','Subaru','Isuzu',
  'Mercedes-Benz','BMW','Volkswagen','Audi','Ford','Chevrolet',
  'Hyundai','Kia','Suzuki','Peugeot','Renault','Land Rover','Jeep',
  'Volvo','Lexus','Infiniti','Porsche','Mercedez','Hino','Scania','MAN',
]

export const MODELS = {
  Toyota:       ['Corolla','Fielder','Axio','Premio','Allion','Prius','Aqua','Vitz','Rav4','Harrier','Land Cruiser','Prado','Hilux','Probox','Succeed','Noah','Voxy','Alphard','Hiace','Fortuner'],
  Nissan:       ['Note','Tiida','X-Trail','Juke','March','Sunny','Patrol','Navara','Serena','Caravan'],
  Mitsubishi:   ['Outlander','Pajero','Colt','Galant','Eclipse Cross','L200','Rosa'],
  Mazda:        ['Demio','Axela','Atenza','CX-5','CX-3','Premacy','MPV','BT-50'],
  Honda:        ['Fit','Jazz','Civic','Accord','CR-V','HR-V','Freed','Stream','Stepwgn'],
  Subaru:       ['Impreza','Legacy','Forester','Outback','XV','WRX'],
  Isuzu:        ['D-Max','MU-X','ELF','NPR','NQR','Forward'],
  'Mercedes-Benz': ['C-Class','E-Class','S-Class','GLE','GLC','Sprinter','Actros'],
  BMW:          ['3 Series','5 Series','7 Series','X3','X5','X6'],
  Volkswagen:   ['Golf','Polo','Passat','Tiguan','Touareg','Amarok','Caddy'],
  Ford:         ['Ranger','Everest','Explorer','Focus','Escape','Transit'],
  Hyundai:      ['Tucson','Santa Fe','i10','i20','Elantra','Sonata','H100'],
  Kia:          ['Picanto','Rio','Sportage','Sorento','Carnival'],
  Suzuki:       ['Alto','Swift','Vitara','Jimny','Ertiga','Carry'],
  Hino:         ['300 Series','500 Series','700 Series'],
  'Land Rover': ['Discovery','Defender','Range Rover','Freelander'],
}

export const COLORS = [
  'White','Silver','Black','Grey','Blue','Red','Green','Maroon',
  'Beige','Gold','Orange','Brown','Yellow','Purple','Navy Blue','Champagne',
]

export const YEARS = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, i) => String(new Date().getFullYear() - i)
)

export function getModels(make) {
  return MODELS[make] || []
}
