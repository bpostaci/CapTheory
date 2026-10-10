# CAP Theory Lab

[Türkçe](#türkçe) | [English](#english)

## Türkçe

CAP teoremini okuyarak değil, **ağı bölüp sonuçlarını izleyerek** öğrenmek için hazırlanmış interaktif bir eğitim uygulaması. Üç düğüm, iki istemci ve bir banka bakiyesi üzerinden tutarlılık, erişilebilirlik ve ağ bölünmesi arasındaki ödünleşimleri gösterir.

Tamamen HTML, CSS ve JavaScript ile çalışır. Sunucu, paket kurulumu veya derleme gerektirmez; tüm senaryolar tarayıcıda çalışan bir mock simülasyondur.

### Çalıştırma

Depoyu klonlayın veya GitHub üzerinden ZIP olarak indirin:

```powershell
git clone https://github.com/bpostaci/CapTheory.git
Set-Location .\CapTheory
```

`index.html` dosyasını bir masaüstü tarayıcısında açın. Microsoft Edge'de doğrudan açmak için:

```powershell
Start-Process msedge -ArgumentList ('"{0}"' -f (Resolve-Path .\index.html).Path)
```

Yerel dosyadan çalışır; internet bağlantısı veya harici bir servis gerekmez.

### İçerik

- **Teori:** Etkileşimli CAP üçgeni, CP/AP/CA karşılaştırması ve kavram açıklamaları.
- **Görsel simülasyon:** İstanbul, New York ve Londra'daki düğümler; istemciler, bağlantılar, animasyonlu mesajlar ve düğüm başına veri deposu.
- **Canlı göstergeler:** Replika durumu, eski okumalar, başarılı yanıt oranı, gecikmeler, çakışmalar, kayıp güncellemeler, zaman grafiği ve olay günlüğü.
- **Mini quiz:** Açıklamalı sekiz soru ve ilgili simülasyona geçiş.
- **TR/EN:** Dil değiştirildiğinde mevcut senaryo, simülasyon durumu ve quiz cevapları korunur.

### Senaryolar

| Senaryo | Ne gösterir? |
|---|---|
| Normal gün | Ağ sağlamken tutarlılık ve erişilebilirliğin birlikte sunulması. |
| Bölünmede CP | Mock modelde okuma/yazma için 2/3 çoğunluk; izole kalan azınlıkta hata veya zaman aşımı. |
| Bölünmede AP | Yerel okuma/yazma, arka plan replikasyonu, eski okumalar ve ağ onarılınca LWW ile uzlaştırma. |
| CA neden olmaz? | Tüm düğümlerin onayını isteyen modelin, bölünmede yazma erişilebilirliğini kaybetmesi. |
| PACELC | Ağ sağlamken bile gecikme ile tutarlılık arasındaki ödünleşim. |
| Serbest laboratuvar | Modu, ağı, düğümleri ve istemci işlemlerini kendiniz yönetmeniz. |

### Kullanım

**Teori** sekmesinden rehberli tura başlayın veya **Simülasyon** sekmesinden bir senaryo seçin. **İleri / Önceki** ile adımlar arasında geçin; **Oto** ile otomatik oynatın.

Serbest laboratuvarda bir düğüme tıklayarak onu çökertip yeniden başlatabilir, bir bağlantıya tıklayarak ağı kesip onarabilirsiniz. Araç çubuğundan CP/AP/CA seçin, bir düğümü izole edin veya ağı onarın. **İstemciler** panelinden bağlı düğümü değiştirip bakiye okuyun ya da yazın.

Simülasyon sekmesinde, bir giriş alanı seçili değilken sağ/sol ok tuşları adımları değiştirir; boşluk tuşu simülasyonu duraklatır veya sürdürür. Hız ayarı mesajları yavaş çekimde izlemenizi sağlar.

Sayfa adresine aşağıdaki parçaları ekleyerek belirli bir görünümü açabilirsiniz. `step` sıfırdan başlar ve önceki adımlar yeniden oynatılarak seçilen duruma ulaşılır:

```text
index.html#sc=cp&lang=tr
index.html#sc=ap&step=7&lang=en
index.html#sc=lab&lang=tr
index.html#quiz&lang=en
```

### Eğitim modeli ve sınırlar

**CAP, her koşulda "üçünden yalnızca ikisi" demek değildir.** Ağ bölünmesi sırasında güçlü tutarlılığı ve her çalışır düğümde erişilebilirliği birlikte garanti edemezsiniz. Ağ sağlamken ikisi birlikte mümkün olabilir.

Bu uygulama bir üretim veritabanı, gerçek banka sistemi veya doğruluğu ispatlanmış bir consensus protokolü değildir. Çoğunluk işlemleri, zaman aşımları ve gecikmeler öğretim için basitleştirilmiştir. Veri depoları görseldir; simülasyon verisi bellekte tutulur. Göstergeler formal bir CAP ispatı veya gerçek performans ölçümü değildir.

**Banka örneği AP'nin risklerini göstermek için bilerek korunmuştur.** AP modunda senaryonun üstündeki uyarı butonu; eski bakiye, çifte harcama, kayıp güncelleme ve denetim risklerini açıklar. Üzerine gelmek veya odaklanmak açıklamayı açar; tıklamak sabitler, dışarı tıklamak veya Esc kapatır. Bu senaryodaki kayıp güncelleme, seçilen **LWW (Last Write Wins)** kuralının sonucudur; AP'nin zorunlu bir özelliği değildir.

DNS ve arama sistemleri, eski verinin bazı durumlarda kabul edilebildiği AP odaklı örnekler olarak kullanılır. Gerçek ürünlerin garantileri işlem türüne, mimariye ve yapılandırmaya göre değişir; bir ürün adı tek başına CAP sınıflandırması değildir.

## English

An interactive learning app for exploring the CAP theorem by **partitioning a network and watching the consequences**. Three nodes, two clients and a bank balance illustrate the trade-offs between consistency, availability and network partitions.

Built with plain HTML, CSS and JavaScript. No server, package installation or build step is needed; every scenario is a browser-based mock simulation.

### Getting started

Clone the repository or download its ZIP from GitHub:

```powershell
git clone https://github.com/bpostaci/CapTheory.git
Set-Location .\CapTheory
```

Open `index.html` in a desktop browser. To open it directly in Microsoft Edge on Windows:

```powershell
Start-Process msedge -ArgumentList ('"{0}"' -f (Resolve-Path .\index.html).Path)
```

The app works from a local file without internet access or external services.

### Features

- **Theory:** An interactive CAP triangle, CP/AP/CA comparisons and a glossary.
- **Visual simulation:** Nodes in Istanbul, New York and London, with clients, links, animated messages and per-node storage.
- **Live indicators:** Replica state, stale reads, successful response rate, latency, conflicts, lost updates, a timeline chart and an event log.
- **Mini quiz:** Eight questions with explanations and links to the relevant scenarios.
- **TR/EN:** Switching languages preserves the current scenario, simulation state and quiz answers.

### Scenarios

| Scenario | What it demonstrates |
|---|---|
| Normal day | Consistency and availability together while the network is healthy. |
| CP during a partition | A mock 2/3 read/write majority; errors or timeouts on the isolated minority. |
| AP during a partition | Local reads/writes, background replication, stale reads and LWW reconciliation after recovery. |
| Why not CA? | An all-node acknowledgement model losing write availability during a partition. |
| PACELC | The latency/consistency trade-off even without a partition. |
| Free laboratory | Direct control over modes, links, nodes and client operations. |

### Controls

Start the guided tour from **Theory**, or choose a scenario in **Simulation**. Use **Next / Previous** to move between steps and **Auto** for autoplay.

In the free laboratory, click a node to crash/restart it or a link to cut/repair it. Use the toolbar to select CP/AP/CA, isolate a node or heal the network. In the **Clients** panel, change the connected node and read or write the balance.

While the simulation tab is active and no input field is focused, the arrow keys change steps and Space pauses/resumes the simulation. Adjust the speed to follow messages in slow motion.

Append these fragments to the page address to open a specific view. `step` is zero-based; preceding actions are replayed to reconstruct the selected state:

```text
index.html#sc=cp&lang=en
index.html#sc=ap&step=7&lang=en
index.html#sc=lab&lang=en
index.html#quiz&lang=en
```

### Educational scope and limitations

**CAP does not mean "pick any two" under all conditions.** During a network partition, strong consistency and availability at every functioning node cannot both be guaranteed. Both can be possible while the network is healthy.

This is not a production database, a real banking system or a proven consensus protocol. Majority operations, timeouts and latency are simplified for teaching. Storage is visual and simulation data lives in memory. The indicators are neither a formal CAP proof nor real-world performance measurements.

**The bank example deliberately exposes the risks of AP.** In AP mode, the warning button above the scenario explains stale balances, double spending, lost updates and audit concerns. Hover or focus to open it, click to pin it, and click outside or press Esc to close it. Lost updates in this scenario result from the chosen **LWW (Last Write Wins)** conflict policy, not from an unavoidable property of AP.

DNS and search systems illustrate AP-oriented use cases where stale data can sometimes be acceptable. Real product guarantees depend on the operation, architecture and configuration; a product name alone is not a CAP classification.

## Files / Dosyalar

| File | Purpose / Amaç |
|---|---|
| `index.html` | Page structure and bilingual static content / Sayfa yapısı ve iki dilli statik içerik |
| `style.css` | Layout, styling and animations / Yerleşim, stil ve animasyonlar |
| `sim.js` | Mock simulation engine / Mock simülasyon motoru |
| `render.js` | Nodes, messages, indicators and chart / Düğümler, mesajlar, göstergeler ve grafik |
| `ui.js` | Controls, scenario runner, quiz and warning tooltip / Kontroller, senaryo akışı, quiz ve uyarı açıklaması |
| `i18n.js` | Language selection and translation helpers / Dil seçimi ve çeviri yardımcıları |
| `content.js` | Turkish scenarios, triangle explanations and quiz / Türkçe senaryolar, üçgen açıklamaları ve quiz |
| `content.en.js` | English content / İngilizce içerik |

## License / Lisans

MIT licensed. See [LICENSE](LICENSE) for the full terms.

MIT lisansı ile sunulmuştur. Tam metin için [LICENSE](LICENSE) dosyasına bakın.
