import { v4 as uuidv4 } from 'uuid';

class SmartTrack {
    dispositivo: null | string = null;
    paginas_visitadas: string[] = [];
    imoveis_visitados: string[] = [];
    inicio_visita: Date = new Date();
    uuid: string | null = null;
    referrer: null | string = null;

    constructor(empresa:string, options?:{noRouter?:boolean}) {
        console.log('SmartTrack iniciado!');
        const cache_visitante_id = localStorage.getItem('visitante_id')
        if (cache_visitante_id === null) {
            const novo_visitante_id = uuidv4();
            localStorage.setItem('visitante_id', novo_visitante_id);
            this.uuid = novo_visitante_id;
        } else {
            this.uuid = cache_visitante_id;
        }

        this.referrer = document.referrer;
        this.dispositivo = this.getDispositivo();

        //https://stackoverflow.com/questions/6390341/how-to-detect-if-url-has-changed-after-hash-in-javascript
        /* These are the modifications: */
        history.pushState = ( f => function pushState(){
            var ret = f.apply(this, arguments);
            window.dispatchEvent(new Event('pushstate'));
            window.dispatchEvent(new Event('locationchange'));
            return ret;
        })(history.pushState);

        history.replaceState = ( f => function replaceState(){
            var ret = f.apply(this, arguments);
            window.dispatchEvent(new Event('replacestate'));
            window.dispatchEvent(new Event('locationchange'));
            return ret;
        })(history.replaceState);

        window.addEventListener('popstate',()=>{
            window.dispatchEvent(new Event('locationchange'))
        });

        const contabilizarImovel = () => {
            this.paginas_visitadas.push(location.pathname)
            if (location.pathname.indexOf('/imovel/') > -1) {
                const split_pathname = location.pathname.split('/');
                this.imoveis_visitados.push(split_pathname[split_pathname.length - 1]);
            } else if (location.pathname.indexOf('/perfilImovel') > -1) {
                const search_url = new URL(location.href);
                var id_imovel = search_url.searchParams.get("id_imovel");
                this.imoveis_visitados.push(id_imovel);
            }
        }

        window.addEventListener('locationchange', () => {
            console.log('mudança de pagina detectada')
            contabilizarImovel()
        })

        if (options && options.noRouter === true) {
            contabilizarImovel()
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                //https://www.w3.org/TR/beacon/
                navigator.sendBeacon('https://us-central1-smartimob-dev-test.cloudfunctions.net/SmartTrackBeacon', this.buildVisitReport(empresa))
            }
        });
    }
    buildVisitReport = (empresa:string) => {
        const fim_visita = new Date();
        const report = JSON.stringify({
            dispositivo: this.dispositivo,
            paginas_visitadas: this.paginas_visitadas.length === 0 ? ['/'] : this.paginas_visitadas,
            imoveis_visitados: this.imoveis_visitados,
            time_inicio_visita: this.inicio_visita.getTime(),
            time_fim_visita: fim_visita.getTime(),
            empresa,
            uuid: this.uuid,
            referrer: this.referrer,
        });
        this.paginas_visitadas = [];
        this.imoveis_visitados = [];
        this.inicio_visita = new Date();
        console.log('Report criado')
        return report
    }
    //https://dev.to/itsabdessalam/detect-current-device-type-with-javascript-490j
    getDispositivo = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
          return "tablet";
        }
        if (
          /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
            ua
          )
        ) {
          return "mobile";
        }
        return "desktop";
    };
}

declare global {
    interface Window {
        SmartTrack: typeof SmartTrack;
    }
}


window.SmartTrack = SmartTrack;