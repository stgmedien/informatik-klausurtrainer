import greenfoot.*;  // (World, Actor, GreenfootImage, Greenfoot and MouseInfo)

/**
 * Die Klasse Tarantel ist eine Unterklasse der Spinnenüberklasse und besitzt eigene Fähigkeiten. Sie ist damit zu mehr fähig als die Spinne. 
 * 
 * @author Jonathan Kreutzheide 
 * @version 11.09.2026
 */
public class Tarantel extends Spinne
{
    public void fuenfSchritte()
    {
        schritt();
        schritt();
        schritt();
        schritt();
        schritt();
    }
    public void fliegeSuchenZurueck()
    { 
        fliegeSuchen();
        rueckWeg();
    }
    private void fliegeSuchen()
    {
        schritt();
        schritt();
        schritt();
        fliegeFressen();
    }
    private void wenden()
    {
        rechtsDrehen();
        rechtsDrehen();
    }
    private void rueckWeg()
    {
        wenden();
        schritt();
        schritt();
        schritt();
    }
    public void drehenBisWegFrei()
    { 
        while(hindernisVorn())
        {
            linksDrehen();
        }
    }
    public void nixHindernisFliegeFressen()
    {
        while(!hindernisRechts())
        {
            fliegeFressen();
            schritt();
        }
    }
    public void wennFliegeFressenWeiter()
    {
        while(fliegeAmPlatz())
        {
            fliegeFressen();
            linksDrehen();
            schritt();
        }
    }
    public void act()
    {
        linksDrehen();
    }
    public void keineKlatschLauf()
    {
        while(!klatscheVorn() && !hindernisVorn())
        {
           schritt();
        }
        while(hindernisVorn())
        {
            linksDrehen();
        }
        while(!hindernisVorn())
        {
            keineKlatschLauf();
        }
    }
    public void rechtsHindernisDannLinks()
    {
        if(hindernisRechts())
        {
            linksDrehen();
        }
    }
    public void wennFliegeAmPlatzFressen()
    {
        if(fliegeAmPlatz())
        {
            fliegeFressen();
            wenden();
        }
    }
    public void wennKlatscheVornAusspuckenUndRechts()
    {
        if(klatscheVorn())
        {
            fliegeAusspucken();
            rechtsDrehen();
            schritt();
            linksDrehen();
        }
    }
    public void derGroßeSpucker()
    {
        if(klatscheVorn())
        {
            wenden();
        }
        else
        {
            fliegeAusspucken();
        }
    }
    public void wennRechtsHinternisDannlinksSonstRechts()
    {
        if(hindernisRechts())
        {
            linksDrehen();
        }
        else
        {
            rechtsDrehen();
        }
    }
    public void wennFliegeDaEssenUndSchrittSonstAusspuckenUndWenden()
    {
        if(fliegeAmPlatz())
        {
            fliegeFressen();
            schritt();
        }
        else
        {
            fliegeAusspucken();
            wenden();
        }
    }
    public void fliegeSuchen2()
    {
        while(!fliegeAmPlatz())
        {
            if(hindernisVorn())
            {
                linksDrehen();
                schritt();
                rechtsDrehen();
                schritt();
                schritt();
                rechtsDrehen();
                schritt();
                linksDrehen();
            }
            else
            {
                schritt();
            }
        }
    }
    public void fliegeTauschen()
    {
        if(fliegeAmPlatz())
        {
            fliegeFressen();
        }
        else
        {
            fliegeAusspucken();
        }
    }
    public void musterTauschen()
    {
        fliegenFuettern(10);
        while (!hindernisRechts())
        {
            feldTauschen();
            schritt();
        }
        feldTauschen();
    }    
    private void feldTauschen()
    {
        if(fliegeAmPlatz())
        {
            fliegeFressen();
        }
        else
        {
            fliegeAusspucken();
        }
    }
    public void dieAlleeEntlang()
    {
        while(hindernisLinks() || hindernisRechts())
        {
            schritt();
        }
    }
    public void tunnelLaufen()
    {
        while(!(hindernisLinks() && hindernisRechts()))
        {
            schritt();
        }
        while(hindernisLinks() && hindernisRechts())
        {
            schritt();
        }
    }
    public void laufenUndFreuen()
    {
        freuenWennGrund();
        while(!klatscheVorn())
        {
            schritt();
            freuenWennGrund();
        }
    }
    private void freuenWennGrund()
    {
        if(fliegeAmPlatz() || hindernisRechts())
        {
            umSichSelberDrehen();
        }
    }
    private void umSichSelberDrehen()
    {
        linksDrehen();
        linksDrehen();
        linksDrehen();
        linksDrehen();
    }
    public void fliegeSuchen3()
    {
        while(!fliegeAmPlatz())
        {
            if(hindernisVorn() || klatscheVorn())
            {
                umgehen();
            }
            else
            {
                schritt();
            }
        }
        fliegeFressen();
    }
    private void umgehen()
    {
        linksDrehen();
        schritt();
        rechtsDrehen();
        schritt();
        schritt();
        rechtsDrehen();
        schritt();
        linksDrehen();
    }
    public void struktogrammeUmsetzen()
    {
        schritt();
        while(hindernisRechts())
        {
            schritt();
        }
        fliegeFressen();
    }
    public void gehenBisHindernis()
    {
        while(!hindernisVorn())
        {
            schritt();
        }
    }
    public void fliegeImWald() {
        bisZumErstenBaum();
       while (!fliegeAmPlatz()) {
           if(hindernisVorn()){
          
             baumUmgehen();
          }
           else{
              schritt();
           }
        }
        fliegeFressen();
    }
    public void baumUmgehen() {
        linksDrehen();
        do {
           schritt();
        }
        while(hindernisRechts());
        rechtsDrehen();
        schritt ();
        while (hindernisRechts()) {
            schritt();
        }
        rechtsDrehen();
        while(!hindernisVorn()){
           schritt();
        }
        linksDrehen();
    }
    public void bisZumErstenBaum() {
        while(!hindernisVorn()){
           schritt();
        }
    }
    public void fliegenReihe(int reihenLaenge)
    {
        fliegenFuettern(100);
        int fliegenAusgespuckt = 0;
        while(fliegenAusgespuckt<reihenLaenge)
        {
            fliegeAusspucken();
            schritt();
            fliegenAusgespuckt = fliegenAusgespuckt+1;
        }
    }
    public void fliegenReihe1()
    {
        for(int i=0;i<5;i++)
        {
            schritt();
        }
        
    }
    public void fliegenRechteck(int hoehe, int breite)
    {
        fliegenFuettern(100);
        for(int i=0;i<hoehe-1;i++)
        {
            fliegeAusspucken();
            schritt();
        }
        rechtsDrehen();
        for(int i=0;i<breite-1;i++)
        {
            fliegeAusspucken();
            schritt();
        }
        rechtsDrehen();
        for(int i=0;i<hoehe-1;i++)
        {
            fliegeAusspucken();
            schritt();
        }
        rechtsDrehen();
        for(int i=0;i<breite-1;i++)
        {
            fliegeAusspucken();
            schritt();
        }
    }
    public void tempoAendern(int geschwindigkeit)
    {
        tempo(geschwindigkeit);        
    }
    public void drehenMitAnzahl(int rotation)
    {
        setRotation(rotation);
    }
}
