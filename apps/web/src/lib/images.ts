/* Free Unsplash photos used for category tiles (same as the prototype). */
const U = (id: string, w = 600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const DEPT_IMG: Record<string, string> = {
  fashion: U("1445205170230-053b83016050"),
  phones: U("1573148195900-7845dcb9b127"),
  computers: U("1496181133206-80ce9b88a853"),
  "tv-audio-gaming": U("1593359677879-a4bb92f829d1"),
  appliances: U("1536353284924-9220c464e262"),
  furniture: U("1555041469-a586c61ea9bc"),
  "home-kitchen": U("1517991104123-1d56a6e81ed9"),
  "kids-baby": U("1559135141-2bea6465fccf"),
  "sports-fitness": U("1532298229144-0ec0c57515c7"),
  "books-hobbies": U("1512820790803-83ca734da794"),
  "beauty-wellness": U("1522336284037-91f7da073525"),
  vehicles: U("1547245324-d777c6f05e80"),
};

export const POPULAR = [
  { category: "Dresses", img: U("1571924849183-a68a3879348d", 240) },
  { category: "Sneakers", img: U("1552346154-21d32810aba3", 240) },
  { category: "Phones", img: U("1573148195900-7845dcb9b127", 240) },
  { category: "Laptops", img: U("1588872657578-7efd1f1555ed", 240) },
  { category: "Fridges", img: U("1630459065645-549fe5a56db4", 240) },
  { category: "Generators & solar", img: U("1700318092011-6e4666e94ab5", 240) },
  { category: "Sofas", img: U("1573866926487-a1865558a9cf", 240) },
  { category: "Gaming", img: U("1507457379470-08b800bebc67", 240) },
  { category: "Strollers & car seats", img: U("1559135141-2bea6465fccf", 240) },
  { category: "Bicycles", img: U("1532298229144-0ec0c57515c7", 240) },
  { category: "Cars", img: U("1547245324-d777c6f05e80", 240) },
  { category: "Bags", img: U("1584917865442-de89df76afd3", 240) },
];

export const HERO_IMG = U("1520006403909-838d6b92c22e", 1400);
