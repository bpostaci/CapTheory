/* ==========================================================
   İçerik: rehberli senaryolar, üçgen açıklamaları, quiz
   ========================================================== */
const SCENARIOS = [
{
  id: 'normal', icon: '🌤', title: 'Normal gün', sub: 'Ağ sağlam: C ve A birlikte', mode: 'CP',
  steps: [
    { title: 'Sahneyle tanışın',
      text: `Üç şehirde üç <b>düğüm</b> var: <b>N1 İstanbul</b>, <b>N2 New York</b>, <b>N3 Londra</b>. Hepsi aynı <code>bakiye</code> kaydının bir kopyasını (replika) tutuyor: <b>100 ₺</b>.<ul>
        <li>🔵 <b>İstemci A</b> İstanbul'a, 🟠 <b>İstemci B</b> Londra'ya bağlı.</li>
        <li>Düğümler arasındaki çizgiler <b>ağ bağlantıları</b>; üzerlerinde akan renkli noktalar <b>mesajlar</b>.</li>
        <li>Her kartın içindeki silindir o düğümün <b>diski (veri deposu)</b>.</li></ul>
        Sistem şu an <b class="cC">CP</b> modunda: her yazma <b>çoğunluk (2/3)</b> onayı ister.`,
      tip: '💡 “İleri ▶” ile adım adım ilerleyin. Her adımda simülasyon gerçekten çalışır; mesajları izleyin.', focus: ['N1', 'N2', 'N3'] },
    { title: 'A, bakiyeyi 150 ₺ yapıyor',
      text: `İstemci A, İstanbul'a <span class="tag" style="background:#4f8cff">YAZ</span> isteği yolluyor. N1 <b>koordinatör</b> olur:<ol>
        <li>Diğerlerine <span class="tag prep">HAZIRLA</span> gönderir.</li><li>Onlar <span class="tag ack">ONAY</span> döner.</li>
        <li>Kendisi + 1 onay = <b>2/3 çoğunluk</b> → <span class="tag commit">KESİNLEŞTİR</span> ve istemciye ✓.</li></ol>`,
      actions: [() => clientWrite('CA', 150)], focus: ['N1', 'client:CA'] },
    { title: 'B, Londra’dan okuyor',
      text: `İstemci B, bakiyeyi Londra'ya (N3) soruyor. N3 emin olmak için çoğunluğa <span class="tag rq">SORGU</span> gönderir ve en yeni sürümü döndürür → <b>150 ₺ ✓</b>.<br><br>Farklı şehir, aynı cevap: işte <b class="cC">tutarlılık (C)</b>.`,
      actions: [() => clientRead('CB')], focus: ['N3', 'client:CB'] },
    { title: 'Ters yönde: B yazar, A okur',
      text: `B, Londra'dan <b>120 ₺</b> yazıyor; ardından A İstanbul'dan okuyor. A <b>120 ₺</b> görmeli.<br><br>Hiçbir istek reddedilmedi → <b class="cA">erişilebilirlik (A)</b> da tam. Ağ bölünmediği için <b class="cP">P</b> henüz sınanmadı.`,
      actions: [() => clientWrite('CB', 120), () => clientRead('CA')], focus: ['client:CA', 'client:CB'] },
    { title: 'Özet',
      text: `<div class="summary">✅ <b>Ağ sağlamken C ve A birlikte mümkündür.</b> Sağdaki göstergelere bakın: C ✓, A %100.<br><br>❓ Peki bir kablo koparsa? Sistem ya <b class="cC">doğruluğu</b> ya da <b class="cA">cevap vermeyi</b> seçmek zorunda kalır.</div>
        <div class="gnav"><button class="btn sm blue" data-open-sc="cp">CP senaryosu ▶</button><button class="btn sm" data-open-sc="ap">AP senaryosu ▶</button></div>` }
  ]
},
{
  id: 'cp', icon: '🛡', title: 'Bölünmede CP', sub: 'Tutarlılığı koru, cevabı feda et', mode: 'CP',
  steps: [
    { title: 'Kural: çoğunluk yoksa işlem yok',
      text: `Sistem <b class="cC">CP</b> modunda. Kural basit: <b>3 düğümün en az 2'si</b> anlaşmadan ne yazma ne okuma yapılır.<br><br>İki çoğunluk her zaman en az bir düğümde kesişir; bu yüzden iki farklı “doğru” asla oluşamaz.`,
      tip: 'Gerçek hayatta: etcd, ZooKeeper, Consul (Raft/Paxos). Banka bakiyesi, kilit servisleri.' },
    { title: 'Başlangıç: A 150 ₺ yazıyor',
      text: 'Her şey normal. 2/3 onayla yazma kesinleşir ve üç kopya da 150 ₺ olur.',
      actions: [() => clientWrite('CA', 150)], focus: ['N1'] },
    { title: '⚡ Ağ bölünmesi: Londra koptu',
      text: `Londra'ya giden iki kablo koptu. N3 <b>ayakta</b> ama N1 ve N2'yi <b>duyamıyor</b>.<ul>
        <li>Çoğunluk tarafı: <b>{N1, N2}</b> → 2/3</li><li>Azınlık tarafı: <b>{N3}</b> → 1/3</li></ul>
        Kartlardaki <b>👥 Çoğunluk</b> satırına bakın.`,
      actions: [() => isolate('N3')], focus: ['N3', 'link:N1|N3', 'link:N2|N3'] },
    { title: 'Çoğunluk tarafı yazmaya devam: A → 80 ₺',
      text: `N1'in N3'e yolladığı <span class="tag prep">HAZIRLA</span> kablodaki duvara çarpıp kaybolur (✕). Ama N2 onaylar → <b>2/3</b> → yazma <b>başarılı</b>.<br><br>Artık N3'teki <b>150 ₺ eski</b>. Soru: N3 bunu birine söyleyecek mi?`,
      actions: [() => clientWrite('CA', 80)], focus: ['N1', 'N2'] },
    { title: 'Azınlıkta okuma: B soruyor',
      text: `B, Londra'ya “bakiye kaç?” diyor. N3 çoğunluğa soramıyor. Elinde 150 ₺ var ama <b>güncel olduğundan emin değil</b>.<br><br>CP kararı: <b>yanlış cevap vermektense hata ver.</b> Kartın üstündeki bekleme çubuğunu izleyin…`,
      actions: [() => clientRead('CB')], focus: ['N3', 'client:CB'] },
    { title: 'Azınlıkta yazma: B → 200 ₺',
      text: `B yazmayı deniyor. N3 yeterli onay toplayamaz → <b>İPTAL</b>. Böylece bölünmenin iki tarafında farklı değerler (<i>split-brain</i>) <b>oluşamaz</b>.`,
      actions: [() => clientWrite('CB', 200)], focus: ['N3'] },
    { title: '🔧 Ağ onarıldı',
      text: `Kablolar düzeldi. Düğümler <span class="tag sync">SENKRON</span> mesajlarıyla sürümleri karşılaştırır; N3 geride kaldığını anlar ve <b>80 ₺</b>'ye güncellenir.`,
      actions: [() => healAll()], focus: ['N3'] },
    { title: 'B tekrar okuyor',
      text: 'Şimdi B, Londra\'dan güncel değeri alır: <b>80 ₺ ✓</b>.',
      actions: [() => clientRead('CB')], focus: ['client:CB'] },
    { title: 'Özet: CP',
      text: `<div class="summary"><b class="cC">C korundu:</b> Hiç eski okuma yok, onaylı hiçbir yazma kaybolmadı.<br><b class="cA">A feda edildi:</b> Bölünme boyunca azınlık tarafı (Londra) hata döndü.<br><br>📊 Sağdaki göstergeler: C ✓, A &lt; %100. Alttaki zaman grafiğinde kırmızı noktalar reddedilen istekler.</div>
        <div class="gnav"><button class="btn sm" data-open-sc="ap">Aynı olaylar AP'de ▶</button></div>` }
  ]
},
{
  id: 'ap', icon: '⚡', title: 'Bölünmede AP', sub: 'Hep cevap ver, tutarlılık sonra', mode: 'AP',
  steps: [
    { title: 'Kural: her düğüm kendi başına cevap verir',
      text: `Sistem <b class="cA">AP</b> modunda. Bir düğüm isteği <b>yerelde</b> işler ve <b>hemen</b> cevap verir. Diğer düğümlere kopyalama arka planda <span class="tag repl">REPLİKA</span> ile yapılır.<br><br>Bağlantı yoksa güncellemeler <b>📮 kuyrukta</b> bekler (<i>hinted handoff</i>).`,
      tip: 'Gerçek hayatta: en bilinen örnek DNS; genel olarak arama sistemleri de böyledir. Veritabanları: Cassandra, DynamoDB, Riak. Kullanım: sepet, beğeni sayısı, sosyal akış.' },
    { title: 'Başlangıç: A 150 ₺ yazıyor',
      text: 'CP\'ye göre fark edin: onay beklenmeden cevap gelir (~1.6 sn). Kopyalar birkaç an sonra yetişir.',
      actions: [() => clientWrite('CA', 150)], focus: ['N1'] },
    { title: '⚡ Ağ bölünmesi: Londra koptu',
      text: 'Aynı kopma: N3 ayakta ama diğerlerini duyamıyor. AP\'de kartlarda <b>⚡ Bağımsız</b> yazar: her düğüm kendi kararını verir.',
      actions: [() => isolate('N3')], focus: ['N3', 'link:N1|N3', 'link:N2|N3'] },
    { title: 'A → 80 ₺ (İstanbul)',
      text: `N1 hemen kabul eder ✓. N2'ye kopya gider, ama N3'e giden <span class="tag repl">REPLİKA</span> duvara çarpar → N1'in kartında <b>📮 kuyrukta</b> belirir.`,
      actions: [() => clientWrite('CA', 80)], focus: ['N1'] },
    { title: 'B okuyor (Londra)',
      text: `N3 bekletmeden cevap verir: <b>150 ₺</b>. Ama gerçekte bakiye 80 ₺! İstemci balonu <b class="warn">⚠ ESKİ</b> uyarısı gösterir.<br><br><b class="cA">A korundu</b> (cevap geldi), <b class="cC">C bozuldu</b> (eski veri).`,
      actions: [() => clientRead('CB')], focus: ['N3', 'client:CB'] },
    { title: 'B → 200 ₺ (Londra) — split-brain!',
      text: `N3 bu yazmayı da kabul eder ✓. Artık iki taraf <b>farklı gerçeklere</b> sahip: İstanbul/New York <b>80</b>, Londra <b>200</b>. Sağdaki C göstergesine bakın: replikalar ayrıştı.`,
      actions: [() => clientWrite('CB', 200)], focus: ['N3'] },
    { title: 'A okuyor (İstanbul)',
      text: 'A, 80 ₺ görür. Oysa en son yazma 200 ₺ idi → bu da <b class="warn">eski okuma</b>.',
      actions: [() => clientRead('CA')], focus: ['client:CA'] },
    { title: '🔧 Ağ onarıldı → çakışma!',
      text: `Kuyruklar boşalır; 80 ve 200 karşılaşır. İkisi de aynı eski değerden (150) türedi, birbirinden habersiz: <b>çakışma ⚔</b>.<br><br>Kural <b>LWW (son yazan kazanır)</b>: zaman damgası daha yeni olan 200 kazanır. A'ya “başarılı” denen <b>80 ₺ yazması sessizce kaybolur 😱</b>.`,
      actions: [() => healAll()], focus: ['N1', 'N2', 'N3'] },
    { title: 'A tekrar okuyor',
      text: 'Tüm kopyalar <b>200 ₺</b>\'ye yakınsadı. Buna <b>nihai tutarlılık (eventual consistency)</b> denir.',
      actions: [() => clientRead('CA')], focus: ['client:CA'] },
    { title: 'Özet: AP',
      text: `<div class="summary"><b class="cA">A korundu:</b> Bölünme boyunca her istek anında cevaplandı.<br><b class="cC">C feda edildi:</b> 2 eski okuma, 1 çakışma, 1 kayıp güncelleme.<br><br>Bakiye için felaket; ama “beğeni sayısı” veya “alışveriş sepeti” için genelde kabul edilebilir.</div>
        <div class="gnav"><button class="btn sm" data-open-sc="ca">Peki CA? ▶</button></div>` }
  ]
},
{
  id: 'ca', icon: '🧱', title: 'CA neden olmaz?', sub: 'Bölünme yok varsayımı', mode: 'CA',
  steps: [
    { title: 'CA: “Ağ asla kopmaz” varsayımı',
      text: `<b class="warn">CA</b>, hem tutarlı hem her zaman erişilebilir olmayı vaat eder; ama bunu ancak <b>bölünme hiç olmazsa</b> yapabilir. Tek sunuculu klasik veritabanları böyledir.<br><br>Burada modelimiz: yazma için <b>tüm düğümler (3/3)</b> onaylamalı, okuma yerelden ve hızlı.` },
    { title: 'Normal yazma: A → 150 ₺',
      text: 'Ağ sağlam: üç düğüm de onaylar → başarılı. Şimdilik her şey güzel.',
      actions: [() => clientWrite('CA', 150)], focus: ['N1'] },
    { title: 'Okuma: B (Londra)',
      text: 'Yerel okuma, hızlı ve güncel: <b>150 ₺ ✓</b>. Ağ sağlamken C + A gerçekten var.',
      actions: [() => clientRead('CB')], focus: ['N3'] },
    { title: '⚡ Ama ağ bölünür…',
      text: 'Gerçek dünyada kablolar kopar, switch\'ler bozulur, bulut bölgeleri birbirini kaybeder. N3 koptu.',
      actions: [() => isolate('N3')], focus: ['N3', 'link:N1|N3', 'link:N2|N3'] },
    { title: 'A → 80 ₺ yazmaya çalışıyor',
      text: `N1, 3/3 onay bekler; N3'ten onay gelemez → <b>İPTAL</b>. Çoğunluk tarafında bile yazma yapılamıyor!`,
      actions: [() => clientWrite('CA', 80)], focus: ['N1'] },
    { title: 'B okuyor (Londra)',
      text: `B, 150 ₺ okur. Doğru (çünkü hiçbir yazma geçmedi), ama sistemin <b>hiçbir yerinde yazma yapılamıyor</b>: <b class="cA">A kaybedildi</b>.<br><br>Eğer N3 kendi başına yazma kabul etseydi, bu sefer <b class="cC">C</b> kaybolurdu. Üçüncü yol yok.`,
      actions: [() => clientRead('CB')], focus: ['N3'] },
    { title: '🔧 Onarım ve tekrar deneme',
      text: 'Ağ düzelince aynı yazma (80 ₺) sorunsuz geçer.',
      actions: [() => healAll(), () => clientWrite('CA', 80)], focus: ['N1'] },
    { title: 'Özet: P bir seçenek değil, bir gerçektir',
      text: `<div class="summary">Dağıtık bir sistemde <b class="cP">P</b>'yi “seçmemek” mümkün değildir; bölünme olur. O anda sistem ya <b class="cC">C</b>'yi ya <b class="cA">A</b>'yı bırakır. Bu yüzden CA pratikte yalnızca <b>tek düğümlü</b> (dağıtık olmayan) sistemleri anlatır.</div>
        <div class="gnav"><button class="btn sm" data-open-sc="pacelc">Bonus: PACELC ▶</button></div>` }
  ]
},
{
  id: 'pacelc', icon: '⏱', title: 'PACELC', sub: 'Bölünme yokken: gecikme vs tutarlılık', mode: 'CP',
  steps: [
    { title: 'Bölünme yokken de bir bedel var',
      text: `PACELC: <b>P</b> varsa <b>A</b>/<b>C</b> seç; <b>E</b>lse (normalde) <b>L</b>atency/<b>C</b> seç.<br><br>Ağ tamamen sağlamken iki modun <b>hızını</b> ve <b>doğruluğunu</b> karşılaştıracağız. Sağ alttaki “Ort. yazma süresi”ne bakın.` },
    { title: 'CP yazma: A → 150 ₺',
      text: 'Çoğunluk onayı bir gidiş-dönüş daha demek: yaklaşık <b>3.6 sn</b>. Güvenli ama yavaş.',
      actions: [() => clientWrite('CA', 150)], focus: ['N1'] },
    { title: 'AP moduna geç ve yaz: A → 175 ₺',
      text: 'Yerel yaz, hemen cevap ver: yaklaşık <b>1.6 sn</b>. İki kat hızlı!',
      actions: [() => setMode('AP'), () => clientWrite('CA', 175)], focus: ['N1'] },
    { title: 'Bölünme YOKKEN eski okuma',
      text: `A, 300 ₺ yazar; çeyrek saniye sonra B Londra'dan okur. Kopya henüz Londra'ya ulaşmadı → B <b class="warn">175 ₺ (eski)</b> görür.<br><br>Hiçbir kablo kopmadı! Hız için tutarlılıktan biraz vazgeçildi.`,
      actions: [() => { clientWrite('CA', 300); later(0.25, () => clientRead('CB')); }], focus: ['client:CB', 'N3'] },
    { title: 'Özet: PACELC',
      text: `<div class="summary"><b>PA/EL</b> (Cassandra, DynamoDB): bölünmede erişilebilir, normalde hızlı.<br><b>PC/EC</b> (etcd, ZooKeeper, HBase): bölünmede tutarlı, normalde de tutarlı ama daha yavaş.<br><br>Yani tasarım kararı sadece “kriz anı” için değil, <b>her gün</b> için verilir.</div>
        <div class="gnav"><button class="btn sm" data-open-sc="lab">Serbest laboratuvar ▶</button></div>` }
  ]
},
{
  id: 'lab', icon: '🧪', title: 'Serbest laboratuvar', sub: 'Kendin dene, kendin boz', mode: 'CP',
  steps: [
    { title: 'Kontroller sizde',
      text: `<ul><li><b>Mod</b>: Üstten CP / AP / CA seçin.</li>
        <li><b>Düğüme tıkla</b> → çökert / kaldır. <b>Bağlantıya tıkla</b> → kes / onar.</li>
        <li><b>⚡ N1/N2/N3 izole</b> → hazır bölünme. <b>🔧 Ağı onar</b> → her şeyi düzelt.</li>
        <li>Sağdaki <b>İstemciler</b> panelinden yaz/oku; istemcinin bağlı olduğu düğümü değiştirin.</li></ul>
        <b>Deney fikirleri:</b><ol>
        <li>CP'de N3'ü izole edin, B'yi önce N3'e sonra N1'e bağlayıp okuyun.</li>
        <li>AP'de bölünmeyken iki taraftan farklı değerler yazın, sonra onarın: hangisi kazandı?</li>
        <li>CP'de <b>iki</b> bağlantıyı da değil, sadece N1–N2'yi kesin. Hâlâ çoğunluk var mı?</li>
        <li>CP'de bir yazma sürerken koordinatör düğümü çökertin.</li>
        <li>Hızı 0.25× yapıp mesajları yavaş çekimde izleyin.</li></ol>`,
      tip: 'Kısayollar: ← / → adımlar, Boşluk = duraklat.' }
  ]
}
];

const TRI_INFO = {
  C: { t: 'C — Consistency (Tutarlılık)', col: '#4f8cff', sc: 'cp',
    h: `<p>Her okuma <b>en son başarılı yazmayı</b> görür ya da hata alır. Sistem dışarıdan tek bir kopya varmış gibi görünür (<i>linearizability</i>).</p>
      <div class="ex">🏦 Bakiyeniz İstanbul'da 80 ₺'ye düştüyse, Londra ATM'si asla 150 ₺ göstermez.</div>
      <p class="muted">Bedeli: Güncel olduğundan emin olamayan düğüm cevap veremez → bekleme veya hata.</p>` },
  A: { t: 'A — Availability (Erişilebilirlik)', col: '#22c55e', sc: 'ap',
    h: `<p>Çökmemiş <b>her düğüm</b>, aldığı <b>her isteğe</b> hata olmayan bir yanıt verir. Yanıtın güncel olması garanti edilmez.</p>
      <div class="ex">📱 Uygulama hiç “şu an hizmet veremiyoruz” demez; ama bazen dünkü bilgiyi gösterebilir.</div>
      <p class="muted">Bedeli: Bölünmede eski okumalar ve çakışan yazmalar.</p>` },
  P: { t: 'P — Partition tolerance (Bölünme toleransı)', col: '#ff5d6c', sc: 'ca',
    h: `<p>Ağ, düğümleri haberleşemeyen gruplara bölse bile sistem çalışmayı sürdürür.</p>
      <div class="ex">✂️ Birden fazla makineye dağıtılmış her sistemde bölünme <b>er ya da geç olur</b>. Bu yüzden P pratikte zorunludur.</div>
      <p class="muted">Asıl soru: Bölünme olduğunda C mi, A mı?</p>` },
  CP: { t: 'CP — Tutarlı ve bölünmeye dayanıklı', col: '#4f8cff', sc: 'cp',
    h: `<p>Bölünmede <b>çoğunluk tarafı</b> çalışmaya devam eder, <b>azınlık tarafı</b> reddeder. Asla iki farklı “doğru” oluşmaz.</p>
      <div class="chipset"><span class="chip">etcd</span><span class="chip">ZooKeeper</span><span class="chip">Consul</span><span class="chip">HBase</span><span class="chip">Spanner</span></div>
      <div class="ex">Kullanım: bakiye, stok, kilit/lider seçimi, yapılandırma.</div>` },
  AP: { t: 'AP — Erişilebilir ve bölünmeye dayanıklı', col: '#22c55e', sc: 'ap',
    h: `<p>Bölünmede iki taraf da yazma/okuma kabul eder. Bağlantı gelince kopyalar uzlaştırılır (<i>eventual consistency</i>, LWW, CRDT…).</p>
      <div class="chipset"><span class="chip star">⭐ DNS</span><span class="chip">🔍 Arama sistemleri</span><span class="chip">Cassandra</span><span class="chip">DynamoDB</span><span class="chip">Riak</span><span class="chip">CouchDB</span></div>
      <p>🌐 <b>En bilinen örnek: DNS.</b> Bir alan adının IP adresini değiştirdiğinizde, dünyadaki DNS sunucuları eski kaydı TTL süresi dolana kadar vermeye devam eder — ama hiçbir zaman “cevap veremem” demez.</p>
      <p>🔍 <b>Arama sistemleri</b> de aynı mantıkla çalışır: birkaç dakika eski bir indeksten sonuç göstermek, hiç sonuç göstermemekten iyidir.</p>
      <div class="ex">Kullanım: DNS, arama sonuçları, sosyal akış, beğeni sayısı, sepet, sensör verisi.</div>` },
  CA: { t: 'CA — Tutarlı ve erişilebilir (bölünmesiz)', col: '#f5b041', sc: 'ca',
    h: `<p>Ancak ağ <b>hiç bölünmezse</b> mümkündür. Pratikte tek düğümlü veritabanlarını anlatır.</p>
      <div class="chipset"><span class="chip">Tek sunucu PostgreSQL</span><span class="chip">Tek sunucu MySQL</span></div>
      <div class="ex">Bölünme olduğu anda CA sistem ya durur (A kaybı) ya da kopyalar ayrışır (C kaybı).</div>` }
};

const QUIZ = [
  { q: 'CP modundaki 3 düğümlü bir sistemde N3 izole oldu. Londra\'daki (N3) istemci okuma yapıyor. Ne olur?',
    o: ['Elindeki son değeri hemen döndürür', 'Hata / zaman aşımı döner', 'N3 otomatik olarak çoğunluk olur', 'Diğer düğümler N3\'ü kapatır'], a: 1,
    e: 'CP sistem eski veri vermektense hata verir. N3 tek başına çoğunluk (2/3) oluşturamaz.', sc: 'cp' },
  { q: 'CAP\'teki “A (Availability)” tam olarak neyi garanti eder?',
    o: ['%99.99 uptime', 'Her isteğe her zaman en güncel cevabı', 'Çökmemiş her düğümün her isteğe hata olmayan bir yanıt vermesi', 'Sistemin hiç çökmemesi'], a: 2,
    e: 'CAP\'teki A, SLA anlamındaki uptime değildir. Yanıtın güncel olması da gerekmez; sadece hata olmamalıdır.', sc: 'ap' },
  { q: 'Neden gerçek dağıtık sistemler için “CA” pratik bir seçenek değildir?',
    o: ['Çok pahalı olduğu için', 'Ağ bölünmeleri kaçınılmaz olduğundan P\'den vazgeçilemez', 'Tutarlılık ve erişilebilirlik hiçbir zaman birlikte olamaz', 'CA sistemler daha yavaştır'], a: 1,
    e: 'Ağ sağlamken C ve A birlikte olabilir. Ama bölünme olduğunda sistemin bir seçim yapması gerekir; P “seçilmez”, başa gelir.', sc: 'ca' },
  { q: 'AP sistemde bölünme sona erdi ve yeni yazma gelmiyor. Kopyalara ne olur?',
    o: ['Sonsuza dek farklı kalırlar', 'Sistem yönetici müdahalesi bekler', 'Zamanla aynı değere yakınsarlar (eventual consistency)', 'Tüm veriler silinir'], a: 2,
    e: 'Kuyruktaki güncellemeler iletilir, çakışmalar (ör. LWW ile) çözülür ve tüm kopyalar aynı değere ulaşır.', sc: 'ap' },
  { q: '5 düğümlü CP bir kümede, yazma için en az kaç düğümün onayı gerekir?',
    o: ['2', '3', '4', '5'], a: 1,
    e: 'Çoğunluk = ⌊5/2⌋+1 = 3. Böylece herhangi iki çoğunluk mutlaka en az bir düğümde kesişir.', sc: 'normal' },
  { q: 'PACELC\'e göre bölünme YOKKEN hangi ödünleşim vardır?',
    o: ['Gecikme (Latency) ile Tutarlılık', 'Erişilebilirlik ile Bölünme', 'Maliyet ile Performans', 'Ödünleşim yoktur'], a: 0,
    e: 'Else durumunda (normal çalışma) seçim: düşük gecikme mi, güçlü tutarlılık mı? Simülasyonda CP yazma ~3.6 sn, AP yazma ~1.6 sn sürdü.', sc: 'pacelc' },
  { q: 'Bir banka hesabının bakiyesini tutacak sistem için hangisi daha uygundur?',
    o: ['AP — hep cevap versin', 'CP — gerekirse reddetsin ama asla yanlış bakiye göstermesin', 'Fark etmez', 'Hiçbiri'], a: 1,
    e: 'Eski bakiye ile para çekmek (çift harcama) kabul edilemez. Kısa süreli “şu an işlem yapılamıyor” daha iyidir.', sc: 'cp' },
  { q: 'Sosyal medyadaki “beğeni sayısı” için en mantıklı tercih hangisi?',
    o: ['CP — her beğeni çoğunluk onayı beklesin', 'AP — sayı birkaç saniye eski olabilir, önemli olan hep çalışması', 'CA', 'Tek sunucu'], a: 1,
    e: 'Beğeni sayısının birkaç saniye geriden gelmesi sorun değildir; uygulamanın hata vermesi ise kullanıcıyı kaçırır.', sc: 'ap' }
];
