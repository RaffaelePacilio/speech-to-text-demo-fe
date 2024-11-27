import { useState, useEffect, useRef } from 'react';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

const VoiceInputForm = () => {
  const [transcript, setTranscript] = useState(''); // Stato per memorizzare la trascrizione
  const [isListening, setIsListening] = useState(false); // Stato per monitorare se il microfono è attivo
  const [error, setError] = useState(null); // Stato per gli errori del riconoscimento vocale
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Riferimento al timeout
  const recognitionTimeout = 5000; 

  const speechSubject = useRef(new Subject<string>()); // Creiamo un Subject per gestire gli eventi vocali
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'it-IT'; // Impostiamo la lingua italiana
  recognition.interimResults = true; // Otteniamo risultati parziali durante la dettatura
  recognition.continuous = true; // Configura il riconoscimento per essere continuo
  recognition.maxAlternatives = 1; // Limita il numero di alternative per ogni risultato

  // Funzione che gestisce i risultati del riconoscimento vocale
  recognition.onresult = (event: any) => {
    const currentTranscript = event.results[event.resultIndex][0].transcript;
    speechSubject.current.next(currentTranscript); // Emettiamo la trascrizione tramite il Subject
    resetTimeout(); // Reset del timeout ogni volta che l'utente parla
  };

  // Funzione che gestisce eventuali errori durante il riconoscimento vocale
  recognition.onerror = (event: any) => {
    setError(event.error);
    console.error("Errore nel riconoscimento vocale:", event.error);
    stopListening();
  };

  // Funzione che avvia il riconoscimento vocale
  const startListening = () => {
    recognition.start();
    setIsListening(true); // Impostiamo lo stato come "microfono attivo"
    setError(null); // Reset dell'errore se c'era
    setTranscript(''); // Cancella il campo di input
    resetTimeout(); // Reset del timeout ogni volta che inizia l'ascolto
  };

  // Funzione che ferma il riconoscimento vocale
  const stopListening = () => {
    recognition.stop(); // Ferma immediatamente il riconoscimento vocale
    setIsListening(false); // Impostiamo lo stato come "microfono spento"
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); // Puliamo il timeout
    }
  };

  // Funzione che avvia il timeout di 5 secondi
  const startTimeout = () => {
    timeoutRef.current = setTimeout(() => {
      console.log("Nessun parlato per 5 secondi, fermo il microfono");
      stopListening(); // Ferma il microfono
    }, recognitionTimeout);
  };

  // Funzione che resetta il timeout
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); // Cancella il timeout esistente
    }
    startTimeout(); // Avvia un nuovo timeout
  };

  // Gestire la trascrizione con RxJS
  useEffect(() => {
    const subscription = speechSubject.current.pipe(
      debounceTime(2000), // Debounce per evitare aggiornamenti troppo frequenti
      distinctUntilChanged(), // Evita duplicazioni della stessa parola
      map((newTranscript: string) => newTranscript.trim()) // Rimuovi eventuali spazi extra
    ).subscribe((newTranscript) => {
      setTranscript((prevTranscript) => {
        // Aggiungiamo il nuovo transcript al precedente, senza duplicare
        if (prevTranscript.endsWith(newTranscript)) {
          return prevTranscript; // Evita duplicati consecutivi
        }
        return prevTranscript + ' ' + newTranscript; // Unisce il testo precedente con il nuovo
      });
    });

    return () => {
      subscription.unsubscribe(); // Pulizia dell'observable al momento dell'unmount
    };
  }, []);

  // Pulizia all'unmount del componente
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Pulizia del timeout
      }
      recognition.abort(); // Ferma qualsiasi riconoscimento vocale in corso
    };
  }, []);

  return (
    <div>
      <h1>Input tramite voce</h1>
      <form>
        <label htmlFor="voiceInput">Inserisci testo tramite voce</label>
        <textarea
          className='text-area'
          id="voiceInput"
          value={transcript} // Valore del campo di input è il transcript
          onChange={(e) => setTranscript(e.target.value)} // Permetti modifiche manuali
          placeholder="Parla per scrivere..."
        />
      </form>
      <div>
        {isListening ? (
          <div>...registra...</div>
        ) : (
          <button onClick={startListening}>Inizia a parlare</button>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
    </div>
  );
};

export default VoiceInputForm;
