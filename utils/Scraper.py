import os
import time
import random
import requests
from lxml import html
from urllib.parse import urljoin, urlparse
from pathlib import Path


def replace_html_entities(text):
    replacements = {
        '&aelig': 'æ',
        '&oslash': 'ø',
        '&aring': 'å'
    }
    
    for entity, char in replacements.items():
        text = text.replace(entity, char)
    
    return text


def scrape_year(year, simulate=True):
    base_url = 'https://o-bergen.no/idrett/terminliste/?&aar='
    url = f"{base_url}{year}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    print(f"Fetching page for year {year}...")

    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    tree = html.fromstring(response.content)
    

    # Read HTML from file, for test purposes
    #with open('Terminliste-2021.htm', 'r', encoding='utf-8') as file:
    #    file_content = file.read()

    # Parse the HTML content
    #tree = html.fromstring(file_content)


    table = tree.xpath('/html/body/table[2]')[0]
    rows = table.xpath('.//tr')

    for row in rows:
        cells = row.xpath('.//td')
        
        if not cells:
            continue
        
        kart_cell_links = cells[-1].xpath('.//a')
        kart_cell_texts = [link.text_content().strip() for link in kart_cell_links]
    
        if len(kart_cell_texts) == 1 and kart_cell_texts[0] == '3D Rerun':
            continue

        date = cells[0].text_content().strip()
        lag = cells[2].text_content().strip()
        technical_arranger = cells[3].text_content().strip()
        place = cells[4].text_content().strip()
        
        folder_name = f"{place}-{date}-{lag}-{technical_arranger}".replace(" ", "-").replace("/", "-")
        folder_name = replace_html_entities(folder_name) # Probably unnecessary, but double-check.
        folder_name = folder_name.rstrip("-")

        if folder_name.startswith("Kart-Sted") or folder_name.startswith("Idrettens-Hus") or "Sommerferie" in folder_name:
            continue

        parent_folder = Path(str(year))

        if not simulate:
            parent_folder.mkdir(parents=True, exist_ok=True)
        
        path = parent_folder / folder_name

        if not simulate:
            path.mkdir(parents=True, exist_ok=True)
        
        links = cells[-1].xpath('.//a')

        for link in links:
            file_url = urljoin(base_url, link.get('href'))

            if 'o-bergen.no' not in urlparse(file_url).netloc:
                continue

            file_name = link.get('href').split('/')[-1]
            file_path = path / file_name
            
            print(f"Downloading {file_url} to {file_path}...")
            
            if not simulate:
                file_response = requests.get(file_url, headers=headers)
                file_response.raise_for_status()
                
                with open(file_path, 'wb') as file:
                    file.write(file_response.content)
            
            time.sleep(10 + random.uniform(5, 15))

        time.sleep(random.uniform(0, 5))

if __name__ == "__main__":
    print()
    response = input("Type 'start' to start scraping> ")
    print()
    if response.lower() == 'start':
        yearsToScrape = range(2024, 2014, -1)
    
        for year in yearsToScrape:
            scrape_year(year, simulate=False)
    

    


