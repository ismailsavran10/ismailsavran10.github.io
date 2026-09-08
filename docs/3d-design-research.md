# 3D sahne kararı — 8 Eylül 2026

İstek: girişteki 3D tasarımı yeniden ele almak; ilk yüklemede takılma ve alt bölümlerde sert hareket olmaması.

## İncelenen örnekler

- [LITTLE FUJI / Omnia1 Analytics](https://www.littlefuji.nz/work/3d-design-for-omnia1-analytics): Tarayıcıdan geçen araç kartları ve bunlara karşılık gelen ekran çıktısı, animasyonla hizmetin işleyişini anlatıyor. Yaratıcının açıklamasında kamera, düşük poligon sayısı ve tekrar kullanılan geometrilerin boyut/performans açısından önemi de yer alıyor. Canlı Spline demosu tarayıcıda incelendi.
- [Bruno Simon](https://bruno-simon.com/): Three.js ile kurulmuş keşfedilebilir sürüş dünyası. Tutarlı bir etkileşim fikri için referans; bu portföyün işe alım ve proje inceleme akışı için bütün bir oyun kurmak gereksiz.
- [Glass Flora](https://glass-flora.vercel.app/): Yansıtıcı yüzey, kontrollü dönüş ve sabit tipografi dengesi tarayıcıda incelendi. Koyu arka plan ve soyut çiçek biçimi bu siteye taşınmadı.
- [SVGator — website animation examples](https://www.svgator.com/blog/website-animation-examples-and-effects/): Kullanıcının gönderdiği derleme; gerçek zamanlı render, mikro etkileşim ve akış anlatımı fikirleri değerlendirildi.

## Uygulanan yorum

Özgün bir mühendislik masası: veri katmanları → öğrenen model/işlemci → uygulama ekranı. Nesneler ortak kamera, ışık, gölge ve malzeme diliyle gerçek WebGL sahnesinde modelleniyor. Hiçbir referansın modeli veya görsel varlığı alınmadı.

- Açık seramik yüzeyler, turkuaz detaylar, koyu ekran; mevcut logoyla uyum.
- Yavaş veri paketleri, çok küçük yükselme hareketleri ve yumuşatılmış imleç tepkisi.
- Üç adım düğmesi açıklamayı değiştiriyor ve ilgili istasyonu hafifçe öne çıkarıyor. Klavye ve azaltılmış hareket modunda açıklamalar kullanılabiliyor.
- Başlangıçta sahnenin aynı kamerasından alınmış WebP görünür; sayfa yüklendikten sonra 3D paketi indirilir. Shader hazırlığı tamamlanınca 900 ms opaklık geçişi yapılır. Metinler gizlenmez ve sahnenin alanı değişmez.
- Ekran dışında, gizli sekmede ve duraklatıldığında çizim döngüsü durur. Veri tasarrufu ve azaltılmış hareket tercihinde 3D otomatik yüklenmez. WebGL/paket hatasında statik görünüm kalır.
- 30 FPS sınırı, en fazla 1,5 DPR; ortak malzemeli tuş/pin/paneller birleştirildi. İlk sahne 69 çizim çağrısı, yaklaşık 56 bin üçgen. Üç boyutlu paket gzip ölçümünde yaklaşık 141 KB; sunucunun aktarım sıkıştırması ayrı bir konudur.

Model ekranındaki çizgiler kavramsaldır; başarı oranı veya bilimsel sonuç iddiası içermez.

## Doğrulama

`.verification/workbench-report.json`: gecikmeli paketle ilk görünüm, sıfır CLS, gerçek piksel değişimi, duraklatma, ekran dışında durma, beş ekran genişliği, WebGL bağlam kaybı, JavaScript kapalı/azaltılmış hareket ve paket indirme hatası.

`.verification/polish-report.json`: kart hizaları, beş proje penceresi, filtreler, klavye odağı, indirme, mobil menü ve otomatik WCAG A/AA taraması.
