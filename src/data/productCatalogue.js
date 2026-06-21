// Raven Sharp POD Suite — Master Product Catalogue
// 60 products across 10 categories
// Platform availability, print specs, Gelato UIDs, Printify Blueprint IDs

export const PLATFORMS = {
  gelato:    { name: "Gelato",          api: true,  badge: "API",   color: "#10b981" },
  printify:  { name: "Printify",        api: true,  badge: "API",   color: "#06b6d4" },
  printful:  { name: "Printful",        api: true,  badge: "API",   color: "#8b5cf6" },
  prodigi:   { name: "Prodigi",         api: true,  badge: "API",   color: "#f59e0b" },
  etsy:      { name: "Etsy",            api: true,  badge: "OAuth", color: "#f97316" },
  shopify:   { name: "Shopify",         api: true,  badge: "API",   color: "#22c55e" },
  redbubble: { name: "Redbubble",       api: false, badge: "CSV",   color: "#ec4899" },
  teepublic: { name: "TeePublic",       api: false, badge: "CSV",   color: "#a78bfa" },
  merch:     { name: "Merch by Amazon", api: false, badge: "CSV",   color: "#fbbf24" },
};

export const CATEGORIES = [
  { id: "wall_art",     label: "Wall Art & Home Decor",      icon: "🖼️" },
  { id: "apparel",      label: "Apparel — Adults",           icon: "👕" },
  { id: "kids",         label: "Apparel — Kids & Baby",      icon: "🍼" },
  { id: "accessories",  label: "Accessories",                icon: "👜" },
  { id: "drinkware",    label: "Drinkware",                  icon: "☕" },
  { id: "stationery",   label: "Stationery & Paper",         icon: "📓" },
  { id: "tech",         label: "Tech Accessories",           icon: "📱" },
  { id: "soft_furnish", label: "Bedding & Soft Furnishings", icon: "🛋️" },
  { id: "bags",         label: "Bags",                       icon: "🎒" },
  { id: "specialty",    label: "Specialty & Seasonal",       icon: "🎁" },
];

export const PRODUCTS = [
  // ─── WALL ART ──────────────────────────────────────────────────────────────
  { id:"art_print_a4", category:"wall_art", name:"Art Print — A4",
    print_spec:{w:2480,h:3508,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","printify","printful","prodigi","redbubble","etsy"],
    gelato_uid:"flat_product_pf_a4_pt_170-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:681, price:{budget:12,mid:22,premium:38}, margin:50,
    tags:["wall art","art print","home decor","poster","print"] },

  { id:"art_print_a3", category:"wall_art", name:"Art Print — A3",
    print_spec:{w:3508,h:4961,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","printify","printful","prodigi","redbubble","etsy"],
    gelato_uid:"flat_product_pf_a3_pt_170-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:682, price:{budget:18,mid:32,premium:55}, margin:50,
    tags:["wall art","art print","A3","large print","home decor"] },

  { id:"art_print_a2", category:"wall_art", name:"Art Print — A2",
    print_spec:{w:4961,h:7016,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","printify","printful","prodigi","etsy"],
    gelato_uid:"flat_product_pf_a2_pt_170-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:683, price:{budget:28,mid:48,premium:85}, margin:52,
    tags:["wall art","large print","A2","statement art","home decor"] },

  { id:"canvas_print", category:"wall_art", name:"Canvas Print",
    print_spec:{w:4800,h:4800,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","prodigi","etsy","shopify"],
    gelato_uid:"canvas_product_pf_30x30-cm_pt_350-gsm-glossy_cl_4-0_ct_none_prt_none_sft_none_set_none_hor",
    printify_blueprint:638, price:{budget:25,mid:55,premium:95}, margin:55,
    tags:["canvas","wall art","gallery wrap","canvas print","home decor"] },

  { id:"framed_print", category:"wall_art", name:"Framed Print",
    print_spec:{w:3600,h:3600,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","printful","prodigi","etsy"],
    gelato_uid:"frame_product_pf_a3_pt_200-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:null, price:{budget:35,mid:65,premium:110}, margin:48,
    tags:["framed print","wall art","gallery frame","home decor"] },

  { id:"poster", category:"wall_art", name:"Poster",
    print_spec:{w:3600,h:5400,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","etsy"],
    gelato_uid:"flat_product_pf_a3_pt_170-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:400, price:{budget:10,mid:20,premium:35}, margin:55,
    tags:["poster","wall art","print","home decor","artwork"] },

  { id:"metal_print", category:"wall_art", name:"Metal Print",
    print_spec:{w:4800,h:3600,dpi:300,format:["PNG"]},
    platforms:["printify","printful","prodigi","etsy"],
    gelato_uid:null, printify_blueprint:648,
    price:{budget:40,mid:75,premium:130}, margin:50,
    tags:["metal print","aluminium print","modern art","wall decor"] },

  { id:"acrylic_print", category:"wall_art", name:"Acrylic Print",
    print_spec:{w:4800,h:3600,dpi:300,format:["PNG"]},
    platforms:["printful","prodigi","etsy"],
    gelato_uid:null, printify_blueprint:null,
    price:{budget:55,mid:95,premium:160}, margin:52,
    tags:["acrylic print","glossy wall art","premium print"] },

  { id:"wall_clock", category:"wall_art", name:"Wall Clock",
    print_spec:{w:3000,h:3000,dpi:300,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:420,
    price:{budget:22,mid:38,premium:58}, margin:45,
    tags:["wall clock","home decor","custom clock","unique gift"] },

  { id:"tapestry", category:"wall_art", name:"Tapestry",
    print_spec:{w:5100,h:5100,dpi:150,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:384,
    price:{budget:28,mid:48,premium:75}, margin:55,
    tags:["tapestry","wall hanging","boho decor","room decor"] },

  // ─── APPAREL ADULTS ────────────────────────────────────────────────────────
  { id:"tshirt_unisex", category:"apparel", name:"T-Shirt — Unisex",
    print_spec:{w:4500,h:5400,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","merch","etsy","shopify"],
    gelato_uid:"apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_classic_gsi_s_gco_white_gpr_4-0",
    printify_blueprint:6, price:{budget:18,mid:28,premium:42}, margin:45,
    tags:["t-shirt","tee","unisex","apparel","graphic tee"] },

  { id:"tshirt_womens", category:"apparel", name:"T-Shirt — Women's",
    print_spec:{w:3600,h:4320,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","etsy","shopify"],
    gelato_uid:"apparel_product_gca_t-shirt_gsc_crewneck_gcu_womens_gqa_classic_gsi_s_gco_white_gpr_4-0",
    printify_blueprint:12, price:{budget:18,mid:28,premium:42}, margin:45,
    tags:["womens t-shirt","ladies tee","fitted tee"] },

  { id:"tshirt_oversized", category:"apparel", name:"T-Shirt — Oversized",
    print_spec:{w:4500,h:5400,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","etsy","shopify"],
    gelato_uid:"apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_oversized_gsi_s_gco_white_gpr_4-0",
    printify_blueprint:1007, price:{budget:22,mid:35,premium:52}, margin:48,
    tags:["oversized tee","streetwear","drop shoulder"] },

  { id:"hoodie", category:"apparel", name:"Hoodie — Pullover",
    print_spec:{w:4500,h:4500,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","merch","etsy","shopify"],
    gelato_uid:"apparel_product_gca_hoodie_gsc_pullover_gcu_unisex_gqa_classic_gsi_s_gco_white_gpr_4-0",
    printify_blueprint:92, price:{budget:32,mid:52,premium:75}, margin:45,
    tags:["hoodie","pullover","sweatshirt","winter apparel"] },

  { id:"hoodie_zip", category:"apparel", name:"Hoodie — Zip-Up",
    print_spec:{w:3600,h:3600,dpi:300,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy","shopify"],
    gelato_uid:null, printify_blueprint:94,
    price:{budget:38,mid:58,premium:85}, margin:42,
    tags:["zip hoodie","full zip","jacket"] },

  { id:"sweatshirt", category:"apparel", name:"Sweatshirt — Crewneck",
    print_spec:{w:4500,h:4500,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","etsy","shopify"],
    gelato_uid:"apparel_product_gca_sweatshirt_gsc_crewneck_gcu_unisex_gqa_classic_gsi_s_gco_white_gpr_4-0",
    printify_blueprint:382, price:{budget:28,mid:45,premium:65}, margin:45,
    tags:["sweatshirt","crewneck","jumper","cozy apparel"] },

  { id:"leggings", category:"apparel", name:"Leggings — All-Over Print",
    print_spec:{w:4200,h:5500,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:247,
    price:{budget:28,mid:45,premium:68}, margin:60,
    tags:["leggings","yoga pants","all-over print","activewear"] },

  { id:"tank_top", category:"apparel", name:"Tank Top — Unisex",
    print_spec:{w:3600,h:4320,dpi:300,format:["PNG"]},
    platforms:["printify","printful","redbubble","teepublic","etsy"],
    gelato_uid:null, printify_blueprint:57,
    price:{budget:15,mid:24,premium:36}, margin:48,
    tags:["tank top","singlet","sleeveless","summer apparel"] },

  { id:"cap", category:"apparel", name:"Cap — Embroidered",
    print_spec:{w:2000,h:2000,dpi:300,format:["PNG"]},
    platforms:["printify","printful","etsy","shopify"],
    gelato_uid:null, printify_blueprint:227,
    price:{budget:18,mid:28,premium:42}, margin:45,
    tags:["cap","hat","snapback","headwear"] },

  { id:"socks", category:"apparel", name:"Socks — All-Over Print",
    print_spec:{w:2400,h:2000,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:170,
    price:{budget:10,mid:16,premium:24}, margin:50,
    tags:["socks","novelty socks","all-over print","fun gift"] },

  // ─── KIDS & BABY ───────────────────────────────────────────────────────────
  { id:"kids_tshirt", category:"kids", name:"Kids T-Shirt",
    print_spec:{w:3000,h:3600,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","etsy"],
    gelato_uid:"apparel_product_gca_t-shirt_gsc_crewneck_gcu_kids_gqa_classic_gsi_s_gco_white_gpr_4-0",
    printify_blueprint:133, price:{budget:16,mid:24,premium:36}, margin:45,
    tags:["kids t-shirt","children's clothing","youth tee"] },

  { id:"baby_bodysuit", category:"kids", name:"Baby Bodysuit / Onesie",
    print_spec:{w:2400,h:2400,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","etsy","shopify"],
    gelato_uid:"apparel_product_gca_bodysuit_gsc_short-sleeve_gcu_baby_gqa_classic_gsi_s_gco_white_gpr_4-0",
    printify_blueprint:218, price:{budget:14,mid:22,premium:34}, margin:48,
    tags:["baby onesie","bodysuit","baby clothes","newborn gift"] },

  { id:"baby_bib", category:"kids", name:"Baby Bib",
    print_spec:{w:2400,h:2400,dpi:300,format:["PNG"]},
    platforms:["printify","printful","etsy"],
    gelato_uid:null, printify_blueprint:219,
    price:{budget:10,mid:16,premium:24}, margin:50,
    tags:["baby bib","bib","baby gift","baby accessories"] },

  { id:"toddler_tshirt", category:"kids", name:"Toddler T-Shirt",
    print_spec:{w:2400,h:2880,dpi:300,format:["PNG"]},
    platforms:["printify","printful","etsy"],
    gelato_uid:null, printify_blueprint:134,
    price:{budget:14,mid:22,premium:32}, margin:45,
    tags:["toddler tee","toddler shirt","kids clothing","2T 3T"] },

  { id:"kids_hoodie", category:"kids", name:"Kids Hoodie",
    print_spec:{w:3000,h:3000,dpi:300,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:368,
    price:{budget:24,mid:38,premium:55}, margin:42,
    tags:["kids hoodie","children's hoodie","youth hoodie"] },

  // ─── ACCESSORIES ───────────────────────────────────────────────────────────
  { id:"tote_bag", category:"accessories", name:"Tote Bag",
    print_spec:{w:3600,h:3600,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","etsy","shopify"],
    gelato_uid:"flat_product_pf_38x42-cm_pt_200-gsm-natural_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:62, price:{budget:15,mid:25,premium:38}, margin:55,
    tags:["tote bag","canvas bag","shopping bag","eco bag"] },

  { id:"backpack", category:"accessories", name:"Backpack — All-Over Print",
    print_spec:{w:3600,h:4200,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:196,
    price:{budget:35,mid:58,premium:88}, margin:48,
    tags:["backpack","all-over print","school bag","travel bag"] },

  { id:"fanny_pack", category:"accessories", name:"Fanny Pack / Belt Bag",
    print_spec:{w:4200,h:2000,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:209,
    price:{budget:22,mid:35,premium:52}, margin:50,
    tags:["fanny pack","belt bag","bum bag","travel accessory"] },

  { id:"sticker_die_cut", category:"accessories", name:"Sticker — Die-Cut",
    print_spec:{w:1200,h:1200,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","redbubble","teepublic","etsy"],
    gelato_uid:"sticker_product_pf_10x10-cm_pt_vinyl_cl_4-0_ct_none_prt_none_sft_none_set_none",
    printify_blueprint:358, price:{budget:3,mid:5,premium:8}, margin:60,
    tags:["sticker","die-cut","vinyl sticker","laptop sticker"] },

  { id:"sticker_sheet", category:"accessories", name:"Sticker Sheet",
    print_spec:{w:3000,h:4000,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","redbubble","etsy"],
    gelato_uid:"sticker_sheet_product_pf_a5_pt_vinyl_cl_4-0_ct_none_prt_none_sft_none_set_none",
    printify_blueprint:359, price:{budget:6,mid:10,premium:16}, margin:62,
    tags:["sticker sheet","sticker pack","planner stickers"] },

  // ─── DRINKWARE ─────────────────────────────────────────────────────────────
  { id:"mug_11oz", category:"drinkware", name:"Mug — 11oz",
    print_spec:{w:3500,h:2400,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","etsy","shopify"],
    gelato_uid:"mug_product_pf_11-oz_pt_ceramic_cl_4-0_ct_none_prt_none_sft_none_set_none",
    printify_blueprint:19, price:{budget:12,mid:20,premium:30}, margin:50,
    tags:["mug","coffee mug","ceramic mug","custom mug","gift"] },

  { id:"mug_15oz", category:"drinkware", name:"Mug — 15oz",
    print_spec:{w:4000,h:2600,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","etsy","shopify"],
    gelato_uid:"mug_product_pf_15-oz_pt_ceramic_cl_4-0_ct_none_prt_none_sft_none_set_none",
    printify_blueprint:20, price:{budget:14,mid:22,premium:34}, margin:50,
    tags:["large mug","15oz mug","big mug","coffee lover"] },

  { id:"tumbler", category:"drinkware", name:"Tumbler / Travel Mug",
    print_spec:{w:3600,h:2400,dpi:300,format:["PNG"]},
    platforms:["printify","printful","etsy","shopify"],
    gelato_uid:null, printify_blueprint:1031,
    price:{budget:22,mid:35,premium:52}, margin:48,
    tags:["tumbler","travel mug","insulated","coffee tumbler"] },

  { id:"water_bottle", category:"drinkware", name:"Water Bottle",
    print_spec:{w:2400,h:3600,dpi:300,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:1033,
    price:{budget:18,mid:28,premium:42}, margin:45,
    tags:["water bottle","drink bottle","eco bottle","gym bottle"] },

  // ─── STATIONERY ────────────────────────────────────────────────────────────
  { id:"notebook", category:"stationery", name:"Notebook / Journal",
    print_spec:{w:2550,h:3300,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","printify","printful","redbubble","etsy"],
    gelato_uid:"notebook_product_pf_a5_pt_hardcover_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:456, price:{budget:12,mid:20,premium:32}, margin:48,
    tags:["notebook","journal","diary","stationery","planner"] },

  { id:"greeting_card", category:"stationery", name:"Greeting Card",
    print_spec:{w:2800,h:4000,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","printify","prodigi","etsy"],
    gelato_uid:"greeting_card_product_pf_a6_pt_300-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none",
    printify_blueprint:474, price:{budget:4,mid:7,premium:12}, margin:55,
    tags:["greeting card","birthday card","gift card","art card"] },

  { id:"postcard", category:"stationery", name:"Postcard",
    print_spec:{w:1800,h:1200,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","prodigi","etsy"],
    gelato_uid:"postcard_product_pf_a6_pt_300-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none",
    printify_blueprint:null, price:{budget:2,mid:4,premium:7}, margin:55,
    tags:["postcard","art print","mail art","stationery"] },

  { id:"calendar", category:"stationery", name:"Wall Calendar",
    print_spec:{w:3508,h:4961,dpi:300,format:["PNG","PDF"]},
    platforms:["gelato","prodigi","etsy"],
    gelato_uid:"calendar_product_pf_a3_pt_170-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:null, price:{budget:18,mid:30,premium:48}, margin:48,
    tags:["wall calendar","calendar","home decor","planner"] },

  { id:"desk_pad", category:"stationery", name:"Desk Pad / Mouse Mat",
    print_spec:{w:4200,h:2100,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:362,
    price:{budget:18,mid:28,premium:42}, margin:50,
    tags:["desk pad","mouse mat","desk accessory","office decor"] },

  // ─── TECH ACCESSORIES ──────────────────────────────────────────────────────
  { id:"phone_case_iphone", category:"tech", name:"Phone Case — iPhone",
    print_spec:{w:1350,h:2700,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","teepublic","etsy"],
    gelato_uid:"phone_case_product_pf_iphone-15_pt_glossy_cl_4-0_ct_none_prt_none_sft_none_set_none",
    printify_blueprint:316, price:{budget:15,mid:28,premium:45}, margin:55,
    tags:["phone case","iPhone case","custom case","phone cover"] },

  { id:"phone_case_samsung", category:"tech", name:"Phone Case — Samsung",
    print_spec:{w:1350,h:2700,dpi:300,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:317,
    price:{budget:15,mid:28,premium:45}, margin:55,
    tags:["Samsung case","phone case","Galaxy case","custom case"] },

  { id:"laptop_sleeve", category:"tech", name:"Laptop Sleeve",
    print_spec:{w:3600,h:2700,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:185,
    price:{budget:22,mid:38,premium:58}, margin:48,
    tags:["laptop sleeve","laptop bag","tech accessory","laptop cover"] },

  { id:"airpods_case", category:"tech", name:"AirPods Case",
    print_spec:{w:1200,h:1200,dpi:300,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:388,
    price:{budget:12,mid:20,premium:32}, margin:52,
    tags:["AirPods case","earbuds case","tech accessory","custom case"] },

  // ─── BEDDING & SOFT FURNISHINGS ────────────────────────────────────────────
  { id:"throw_pillow", category:"soft_furnish", name:"Throw Pillow",
    print_spec:{w:3600,h:3600,dpi:150,format:["PNG"]},
    platforms:["gelato","printify","printful","redbubble","etsy"],
    gelato_uid:"flat_product_pf_45x45-cm_pt_polyester_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:159, price:{budget:22,mid:38,premium:58}, margin:50,
    tags:["throw pillow","cushion","decorative pillow","home decor"] },

  { id:"blanket", category:"soft_furnish", name:"Fleece Blanket",
    print_spec:{w:4800,h:6000,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:384,
    price:{budget:35,mid:58,premium:88}, margin:52,
    tags:["blanket","fleece blanket","cozy blanket","throw blanket"] },

  { id:"duvet_cover", category:"soft_furnish", name:"Duvet Cover",
    print_spec:{w:5400,h:7200,dpi:150,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:432,
    price:{budget:55,mid:90,premium:140}, margin:48,
    tags:["duvet cover","bedding","bedroom decor","custom bedding"] },

  { id:"shower_curtain", category:"soft_furnish", name:"Shower Curtain",
    print_spec:{w:4800,h:7200,dpi:150,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:371,
    price:{budget:38,mid:62,premium:95}, margin:50,
    tags:["shower curtain","bathroom decor","custom shower curtain"] },

  // ─── BAGS ─────────────────────────────────────────────────────────────────
  { id:"canvas_tote_large", category:"bags", name:"Canvas Tote — Large",
    print_spec:{w:4200,h:4200,dpi:300,format:["PNG"]},
    platforms:["gelato","printify","printful","etsy","shopify"],
    gelato_uid:"flat_product_pf_42x42-cm_pt_200-gsm-natural_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    printify_blueprint:63, price:{budget:18,mid:30,premium:45}, margin:55,
    tags:["large tote bag","canvas tote","market bag","beach bag"] },

  { id:"drawstring_bag", category:"bags", name:"Drawstring Bag",
    print_spec:{w:3000,h:3600,dpi:150,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:173,
    price:{budget:15,mid:24,premium:36}, margin:50,
    tags:["drawstring bag","gym bag","backpack","sport bag"] },

  { id:"cosmetic_bag", category:"bags", name:"Cosmetic / Makeup Bag",
    print_spec:{w:2400,h:1600,dpi:300,format:["PNG"]},
    platforms:["printify","printful","etsy"],
    gelato_uid:null, printify_blueprint:226,
    price:{budget:16,mid:26,premium:40}, margin:48,
    tags:["makeup bag","cosmetic bag","toiletry bag","gift for her"] },

  // ─── SPECIALTY & SEASONAL ─────────────────────────────────────────────────
  { id:"puzzle", category:"specialty", name:"Jigsaw Puzzle",
    print_spec:{w:3600,h:2700,dpi:300,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:351,
    price:{budget:22,mid:38,premium:58}, margin:52,
    tags:["jigsaw puzzle","puzzle","unique gift","family activity"] },

  { id:"playing_cards", category:"specialty", name:"Playing Cards",
    print_spec:{w:2250,h:3150,dpi:300,format:["PNG","PDF"]},
    platforms:["printify","prodigi","etsy"],
    gelato_uid:null, printify_blueprint:420,
    price:{budget:18,mid:28,premium:42}, margin:50,
    tags:["playing cards","card game","custom cards","unique gift"] },

  { id:"ornament", category:"specialty", name:"Christmas Ornament",
    print_spec:{w:1800,h:1800,dpi:300,format:["PNG"]},
    platforms:["printify","etsy"],
    gelato_uid:null, printify_blueprint:425,
    price:{budget:10,mid:18,premium:28}, margin:55,
    tags:["ornament","Christmas ornament","holiday gift","tree decoration"] },

  { id:"magnet", category:"specialty", name:"Fridge Magnet",
    print_spec:{w:1200,h:1200,dpi:300,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:352,
    price:{budget:6,mid:10,premium:16}, margin:58,
    tags:["magnet","fridge magnet","kitchen decor","souvenir"] },

  { id:"pin_badge", category:"specialty", name:"Pin / Button Badge",
    print_spec:{w:900,h:900,dpi:300,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:271,
    price:{budget:4,mid:7,premium:12}, margin:60,
    tags:["pin badge","button badge","enamel pin","accessories"] },

  { id:"coaster", category:"specialty", name:"Coaster Set",
    print_spec:{w:2400,h:2400,dpi:300,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:287,
    price:{budget:14,mid:22,premium:35}, margin:52,
    tags:["coaster","drinks coaster","kitchen decor","gift set"] },

  { id:"banner", category:"specialty", name:"Banner / Flag",
    print_spec:{w:3600,h:7200,dpi:150,format:["PNG"]},
    platforms:["printify","prodigi","etsy"],
    gelato_uid:null, printify_blueprint:415,
    price:{budget:25,mid:42,premium:65}, margin:48,
    tags:["banner","flag","outdoor decor","event banner"] },

  { id:"apron", category:"specialty", name:"Kitchen Apron",
    print_spec:{w:2400,h:3200,dpi:300,format:["PNG"]},
    platforms:["printify","printful","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:368,
    price:{budget:22,mid:36,premium:55}, margin:50,
    tags:["apron","kitchen apron","cooking gift","chef apron"] },

  { id:"yoga_mat", category:"specialty", name:"Yoga Mat",
    print_spec:{w:4500,h:7500,dpi:150,format:["PNG"]},
    platforms:["printify","etsy"],
    gelato_uid:null, printify_blueprint:389,
    price:{budget:35,mid:58,premium:88}, margin:50,
    tags:["yoga mat","exercise mat","fitness accessory","custom yoga mat"] },

  { id:"face_mask", category:"specialty", name:"Face Mask / Gaiter",
    print_spec:{w:2400,h:1600,dpi:300,format:["PNG"]},
    platforms:["printify","redbubble","etsy"],
    gelato_uid:null, printify_blueprint:411,
    price:{budget:10,mid:16,premium:24}, margin:55,
    tags:["face mask","neck gaiter","outdoor accessory"] },
];

// Get products available for a specific platform
export function getProductsForPlatform(platformId) {
  return PRODUCTS.filter(p => p.platforms.includes(platformId));
}

// Get product by id
export function getProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

// Get products by category
export function getProductsByCategory(categoryId) {
  return PRODUCTS.filter(p => p.category === categoryId);
}

export default PRODUCTS;
