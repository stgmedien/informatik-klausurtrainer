import greenfoot.*;  // (World, Actor, GreenfootImage, and Greenfoot)
import java.util.List;
//import java.io.*;
/**
 * Klasse fÃ¼r Objekte vom Typ Spinne.
 * @author Mathias MÃ¼ller
 * @version 29.08.2006
 * @geändert 22.08.2012 Silke Reitemeyer Fehlermeldungen, Pause
 */
public class Spinne extends Actor
{

    private int aktionenProSekunde;
    private int fliegen;
    private boolean nachrichten;
    private boolean geklatscht;
    
    
    /**
     * Erzeugt ein Spinne-Objekt ohne Fliegen mit 4 Aktionen pro Sekunde.
     */
    public Spinne()
    {
        aktionenProSekunde = 4;
        fliegen = 0;
        nachrichten = true;
        geklatscht = false;
    }
    
    /**
     * Erzeugt ein Spinne-Objekt mit einer gegebenen Anzahl Fliegen und 4 Aktionen pro Sekunde.
     * @param fliegen die Anzahl der gefressenen Fliegen
     */
    public Spinne(int fliegen)
    {
        aktionenProSekunde = 200;
        if(fliegen < 0) {
            fliegen = 0;
        }
        this.fliegen = fliegen;
        nachrichten = true;
        geklatscht = false;
    }
    
    /**
     * Die Spinne dreht sich um 90Â° entgegen dem Uhrzeigersinn. Wirkungslos bei geklatschter Spinne.
     */
    public void linksDrehen() {
        if(!geklatscht) {
            pause();
            setRotation((getRotation()+270) % 360);
            pause();
        }
    }
    
    /**
     * Die Spinne dreht sich um 90Â° im Uhrzeigersinn. Wirkungslos bei geklatschter Spinne.
     */
    public void rechtsDrehen() {
        if(!geklatscht) {
            pause();
            setRotation((getRotation()+90) % 360);
            pause();
        }
    }
    
      
    
    /**
     * Die Spinne geht einen Schritt in Blickrichtung, wenn sie nicht vor einem Hindernis steht. Wirkungslos bei geklatschter Spinne.
     * LÃ¤uft sie dabei auf eine Klatsche, wird sie geklatscht.
     */
    public void schritt() {
        if(!geklatscht) {
            pause();
            boolean kv = klatscheVorn();
            int richtung = getRotation();
            int x = 0;
            int y = 0;
            switch(richtung) {
                case 0:
                    x = getX() + 1;
                    y = getY();
                    break;
                case 90:
                    x = getX();
                    y = getY()+1;
                    break;
                case 180:
                    x = getX()-1;
                    y = getY();
                    break;
                case 270:
                    x = getX();
                    y = getY()-1;
                    break;
            }
            if(!hindernisVorn()) {
                setLocation(x,y);
                if(kv) {
                    geklatscht = true;
                    setImage("images/thekla_geklatscht.png");
                    pause();
                    if(nachrichten) {
                         System.out.println("Die Spinne wurde geklatscht.");
                    }
                }
                pause();
            }
            else {
                if(nachrichten) {
                    System.out.println("Vor der Spinne liegt ein Hindernis.");
                }
            }
        }
    }
    
    /**
     * Die Spinne frisst eine Fliege, falls mindestens eine auf dem Platz liegt. Wirkungslos bei geklatschter Spinne.
     */
    public void fliegeFressen() {
        if(!geklatscht) {
            pause();
            Actor fliege = getOneObjectAtOffset(0,0,Fliege.class);
            if(fliege != null) {
                fliegen++;
                getWorld().removeObject(fliege);
                pause();
            }
            else {
                if(nachrichten) {
                     System.out.println("Auf dem Platz liegt keine Fliege.");
                }
            }
        }
    }
    
    /**
     * Die Spinne wird mit anzahl zusŠtzlichen Fliegen gefŸttert. Wirkungslos bei geklatschter Spinne.
     */
    public void fliegenFuettern(int anzahl) {
        if(!geklatscht) {
            fliegen +=anzahl;
        }
    }
    
    /**
     * Die Spinne spuckt eine Fliege aus, falls sie mindestens eine gefressen hat. Wirkungslos bei geklatschter Spinne.
     */
    public void fliegeAusspucken() {
        if(!geklatscht) {
            pause();
            if(fliegen>0) {
                getWorld().addObject(new Fliege(),getX(),getY());
                setLocation(getX(),getY());
                fliegen--;
                pause();
            }
            else {
                if(nachrichten) {
                    System.out.println("Die Spinne hat keine Fliege gefressen.");
                }
            }
        }
    }
        
    /**
     * PrÃ¼ft, ob auf dem Platz vor der Spinne eine Klatsche lauert. 
     * @return true: Klatsche, false: keine Klatsche, bei geklatschter Spinne: immer false
     */
    public boolean klatscheVorn() {
        if(!geklatscht) {
            int dx = 0;
            int dy = 0;
            int richtung = getRotation();
            switch(richtung) {
                case 0:
                    dx = 1; break;
                case 90:
                    dy = 1; break;
                case 180:
                    dx = -1; break;
                case 270:
                    dy = -1; break;
            }
            Actor klatsche = getOneObjectAtOffset(dx,dy,Klatsche.class);
            return klatsche != null;
        }
        else {
            return false;
        }
    }
    
    /**
     * PrÃ¼ft, ob auf dem Platz vor der Spinne ein Hindernis liegt.
     * @return true: Hindernis, false: kein Hindernis, bei geklatschter Spinne: immer false
     */
    public boolean hindernisVorn() {
        if(!geklatscht) {
            int dx = 0;
            int dy = 0;
            int richtung = getRotation();
            switch(richtung) {
                case 0:
                    dx = 1; break;
                case 90:
                    dy = 1; break;
                case 180:
                    dx = -1; break;
                case 270:
                    dy = -1; break;
            }
            Actor klatsche = getOneObjectAtOffset(dx,dy,Hindernis.class);
            return klatsche != null;
        }
        else {
            return false;
        }
    }
    
    /**
     * PrÃ¼ft, ob rechts neben der Spinne ein Hindernis liegt.
     * @return true: Hindernis, false: kein Hindernis, bei geklatschter Spinne: immer false
     */
    public boolean hindernisRechts() {
        if(!geklatscht) {
            int dx = 0;
            int dy = 0;
            int richtung = getRotation();
            switch(richtung) {
                case 0:
                    dy = 1; break;
                case 90:
                    dx = -1; break;
                case 180:
                    dy = -1; break;
                case 270:
                    dx = 1; break;
            }
            Actor klatsche = getOneObjectAtOffset(dx,dy,Hindernis.class);
            return klatsche != null;
        }
        else {
            return false;
        }
    }
    
    /**
     * PrÃ¼ft, ob links neben der Spinne ein Hindernis liegt.
     * @return true: Hindernis, false: kein Hindernis, bei geklatschter Spinne: immer false
     */
    public boolean hindernisLinks() {
        if(!geklatscht) {
            int dx = 0;
            int dy = 0;
            int richtung = getRotation();
            switch(richtung) {
                case 0:
                    dy = -1; break;
                case 90:
                    dx = 1; break;
                case 180:
                    dy = 1; break;
                case 270:
                    dx = -1; break;
            }
            Actor klatsche = getOneObjectAtOffset(dx,dy,Hindernis.class);
            return klatsche != null;
        }
        else {
            return false;
        }
    }
    
    /**
     * PrÃ¼ft, ob auf dem Platz der Spinne mindestens eine Fliege liegt.
     * @return true: Fliege(n) am Platz, false: keine Fliegen am Platz, bei geklatschter Fliege: immer false
     */
    public boolean fliegeAmPlatz() {
        if(!geklatscht) {
            Actor fliege = getOneObjectAtOffset(0,0,Fliege.class);
            return fliege != null;
        }
        else {
            return false;
        }
    }
    public boolean fliegeVorn() {
    if (geklatscht) {
        return false;
    }
    int dx = 0;
    int dy = 0;
    switch (getRotation()) {
        case 0:   dx = 1;  break; // rechts
        case 90:  dy = 1;  break; // unten
        case 180: dx = -1; break; // links
        case 270: dy = -1; break; // oben
    }
    Actor fliege = getOneObjectAtOffset(dx, dy, Fliege.class);
    return fliege != null;
}
    
    /**
     * Liefert die Anzahl der Fliegen auf dem Platz der Spinne.
     * @return die Anzahl der Fliegen auf Platz der Spinne, bei geklatschter Spinne: immer 0
     */
    public int fliegenAmPlatz() {
        if(!geklatscht) {
            List fliegen = getObjectsAtOffset(0,0,Fliege.class);
            return fliegen.size();
        }
        else {
            return 0;
        }
    }
    
    /**
     * PrÃ¼ft, ob die Spinne mindestens eine Fliege gefressen hat.
     * @return true: Fliege(n) gefressen, false: keine Fliege gefressen, bei geklatschter Spinne: immer false
     */
    public boolean fliegeGefressen() {
        if(!geklatscht) {
            return fliegen > 0;
        }
        else {
            return false;
        }
    }
    
    /**
     * Liefert die Anzahl der Fliegen, die die Spinne gefressen hat.
     * @return die Anzahl der Fliegen, die die Spinne gefressen hat, bei geklatschter Spinne: immer 0
     */
    public int fliegenGefressen() {
        if(!geklatscht) {
            return fliegen;
        }
        else {
            return 0;
        }
    }

    /**
     * Schaltet die Anzeige von Fehlern und Warnungen ein.
     */
    public void nachrichtenZeigen() {
        if(!geklatscht) {
            nachrichten = true;
        }
    }
    
    /**
     * Schaltet die Anzeige von Fehlern und Warnungen aus.
     */
    public void nachrichtenVerbergen() {
        if(!geklatscht) {
            nachrichten = false;
        }
    }
    
    /**
     * Legt das Tempo der ProgrammausfÃ¼hrung fest.
     * @param die Anzahl der Aktionen pro Sekunde
     */
    public void tempo(int aktionenProSekunde) {
        this.aktionenProSekunde = aktionenProSekunde;
    }
    
    /**
     * Die Spinne unterbricht die ProgrammausfÃ¼hrung fÃ¼r eine gegebene Zeit.
     * @param die LÃ¤nge der Unterbrechung in Millisekunden
     */
    
    private void pause() {
        Greenfoot.delay(1);
    }
    
    
}
