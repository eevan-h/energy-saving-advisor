export const places = [
  { id: 'office', name: '辦公室及事務所', description: '一般辦公空間、事務所等', path: 'M5 21V3h14v18M3 21h18M9 7h2m2 0h2M9 11h2m2 0h2m-6 4h2m2 0h2m-5 6v-3h4v3' },
  { id: 'retail', name: '零售商店', description: '販售商品的店面與零售空間', path: 'M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M8 21v-6h8v6' },
  { id: 'food', name: '餐飲服務業', description: '餐廳、咖啡店、小吃店等', path: 'M5 3v6c0 4 6 4 6 0V3M8 3v18M20 21V3c-5 2-5 10 0 10' },
  { id: 'factory', name: '小型工廠', description: '小型製造、加工與生產場所', path: 'M3 21V10l6 3V8l6 4V3h5l1 18H3Zm4-4h2m3 0h2m3 0h1' },
  { id: 'service', name: '其他服務業', description: '美容美髮、洗衣店及其他服務場所', path: 'M4 21v-8m16 8v-8M3 21h18M8 21v-6h8v6M3 9l9-7 9 7M5 9h14v4H5V9Z' },
] as const

export type PlaceType = typeof places[number]['id']


