import { v4 as uuidv4 } from 'uuid';

class SmartTrack {
    dispositivo: null | string = null;
    paginas_visitadas: string[] = [];
    imoveis_visitados: string[] = [];
    imoveis_tempo_visitado: number[] = [];
    imoveis_tempo_visitado_check: boolean[] = [];
    hidden_delay: number = 0;
    fotos_tempo_info: {
        [imovel_id: string]: {
            [foto_id: string]: number
        }
    } = {}
    inicio_visita: Date = new Date();
    uuid: string | null = null;
    referrer: null | string = null;
    filtros: any[] = []

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
            if (this.imoveis_tempo_visitado.length > 0) {
                const imoveis_tempo_visitado_last = this.imoveis_tempo_visitado.length - 1;
                if (this.imoveis_tempo_visitado_check[imoveis_tempo_visitado_last] === false) {
                    this.imoveis_tempo_visitado[imoveis_tempo_visitado_last] = (new Date().getTime() - this.imoveis_tempo_visitado[imoveis_tempo_visitado_last]) - this.hidden_delay;
                    this.imoveis_tempo_visitado_check[imoveis_tempo_visitado_last] = true;
                }
            }
            if (location.pathname.indexOf('/imovel/') > -1) {
                const split_pathname = location.pathname.split('/');
                this.imoveis_visitados.push(split_pathname[split_pathname.length - 1]);
                this.imoveis_tempo_visitado.push(new Date().getTime())
                this.imoveis_tempo_visitado_check.push(false)
            } else if (location.pathname.indexOf('/perfilImovel') > -1 || location.pathname.indexOf('/cardImovel') > -1) {
                const search_url = new URL(location.href);
                var id_imovel = search_url.searchParams.get("id_imovel");
                this.imoveis_visitados.push(id_imovel);
                this.imoveis_tempo_visitado.push(new Date().getTime())
                this.imoveis_tempo_visitado_check.push(false)
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
                this.hidden_delay = new Date().getTime()
                //https://www.w3.org/TR/beacon/
                
                const body = this.buildVisitReport(empresa)
                const headers = {
                    type: 'application/json',
                };
                const blob = new Blob([JSON.stringify(body)], headers);
                navigator.sendBeacon('https://us-central1-smartimob-dev-test.cloudfunctions.net/SmartTrackBeacon', blob)
            } else {
                this.hidden_delay = new Date().getTime() - this.hidden_delay
            }
        });
    }
    setFotoTempo = ({ id, imovel, tempo }: { id: string, imovel: string, tempo: number }) => {
        if (!this.fotos_tempo_info[imovel]) this.fotos_tempo_info[imovel] = {};
        this.fotos_tempo_info[imovel][id] = tempo
    }
    addFotoTempo = ({ id, imovel, tempo }: { id: string, imovel: string, tempo: number }) => {
        if (!this.fotos_tempo_info[imovel]) this.fotos_tempo_info[imovel] = {};
        if (!this.fotos_tempo_info[imovel][id]) this.fotos_tempo_info[imovel][id] = 0;
        this.fotos_tempo_info[imovel][id] += tempo
    }
    buildVisitReport = (empresa:string) => {
        const fim_visita = new Date();
        const report_obj:any = {
            dispositivo: this.dispositivo,
            paginas_visitadas: this.paginas_visitadas.length === 0 ? ['/'] : this.paginas_visitadas,
            imoveis_visitados: this.imoveis_visitados,
            time_inicio_visita: this.inicio_visita.getTime(),
            time_fim_visita: fim_visita.getTime(),
            empresa,
            filtros: this.filtros,
            uuid: this.uuid,
            referrer: this.referrer,
        }
        const report = JSON.stringify(report_obj);
        this.paginas_visitadas = [];
        this.imoveis_visitados = [];
        this.inicio_visita = new Date();
        console.log('Report criado')
        return report
    }
    getAsVisitante = () => {
        return {
            visitas: {
                imoveis_visitados: this.imoveis_visitados,
                time_inicio_visita: this.inicio_visita.getTime(),
                time_fim_visita: new Date().getTime(),
            }
        }
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
    registrarFiltro = (filtro:any) => {
        this.filtros.push(filtro)
        return "desktop";
    };
}

declare global {
    interface Window {
        SmartTrack: typeof SmartTrack;
    }
}

window.SmartTrack = SmartTrack;