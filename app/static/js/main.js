// Cache management
function getFromCache() {
    const cachedData = localStorage.getItem('itemsData');
    if (!cachedData) return null;
    
    try {
        const { timestamp, items } = JSON.parse(cachedData);
        const now = Date.now();
        if (now - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('itemsData');
            return null;
        }
        return items;
    } catch (e) {
        console.error('Error parsing cache:', e);
        localStorage.removeItem('itemsData');
        return null;
    }
}

function saveToCache(items) {
    const cacheData = {
        timestamp: Date.now(),
        items: items
    };
    localStorage.setItem('itemsData', JSON.stringify(cacheData));
}

// UI Interaction
function toggleCategory(categoryId) {
    const category = document.getElementById(categoryId);
    const items = category.getElementsByClassName('item');
    Array.from(items).forEach(item => {
        item.style.display = item.style.display === 'none' ? 'block' : 'none';
    });
}

function expandAll() {
    const items = document.getElementsByClassName('item');
    Array.from(items).forEach(item => {
        item.style.display = 'block';
    });
}

function collapseAll() {
    const items = document.getElementsByClassName('item');
    Array.from(items).forEach(item => {
        item.style.display = 'none';
    });
}

function toggleItem(itemId) {
    const details = document.getElementById(itemId + '-details');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
}

function toggleSection(element) {
    element.classList.toggle('collapsed');
}

// Data fetching and display
async function fetchData() {
    try {
        const response = await fetch('/api/items');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        if (data.success) {
            saveToCache(data.items);
            displayItems(data.items);
            updateTimestamp();
        } else {
            throw new Error(data.error || 'Failed to fetch items');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('items').innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

function getTierColor(tier) {
    return tier ? tier.toUpperCase() : 'NORMAL';
}

function displayItems(items) {
    const categories = {};
    
    // Sort items into categories
    Object.entries(items).forEach(([name, item]) => {
        const type = item.type || 'Unknown';
        if (!categories[type]) categories[type] = [];
        categories[type].push({ name, ...item });
    });
    
    // Generate HTML for each category
    let html = '';
    Object.entries(categories).sort().forEach(([category, categoryItems]) => {
        // Sort items by level requirement
        categoryItems.sort((a, b) => {
            const levelA = a.requirements?.level || 0;
            const levelB = b.requirements?.level || 0;
            return levelA - levelB;
        });
        
        html += `
            <div class="category">
                <div class="category-header" onclick="toggleCategory('${category}')">${category} (${categoryItems.length} items)</div>
                <div id="${category}">
        `;
        
        categoryItems.forEach(item => {
            const tierClass = getTierColor(item.tier);
            const tradeClass = item.restrictions?.untradeable ? 'untradeable' : 'tradeable';
            const levelReq = item.requirements?.level || 'None';
            const xpBonus = item.identifications?.xpBonus?.max || 0;
            
            html += `
                <div class="item" style="display: none;">
                    <div class="item-header" onclick="toggleItem('${item.name}')">
                        <span class="${tierClass}">${item.name}</span>
                        <span class="${tradeClass}">[${item.restrictions?.untradeable ? 'Untradeable' : 'Tradeable'}]</span>
                        - Level ${levelReq} - XP: +${xpBonus}%
                    </div>
                    <div class="item-details" id="${item.name}-details">
                        <p>Requirements: ${JSON.stringify(item.requirements, null, 2)}</p>
                        <p>Stats/Identifications: ${JSON.stringify(item.identifications, null, 2)}</p>
                        ${item.restrictions?.untradeable ? `<p>Drop: ${item.dropRestriction}</p>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    document.getElementById('items').innerHTML = html;
}

function updateTimestamp() {
    const timestamp = document.getElementById('timestamp');
    const cachedData = localStorage.getItem('itemsData');
    
    if (cachedData) {
        const { timestamp: lastUpdate } = JSON.parse(cachedData);
        const nextUpdate = new Date(lastUpdate + 24 * 60 * 60 * 1000);
        
        // Clear any existing countdown
        if (timestamp.dataset.intervalId) {
            clearInterval(parseInt(timestamp.dataset.intervalId));
        }
        
        // Update countdown every second
        const intervalId = setInterval(() => {
            const now = new Date();
            const diff = nextUpdate - now;
            
            if (diff <= 0) {
                clearInterval(intervalId);
                timestamp.innerHTML = 'Cache expired. Refreshing...';
                fetchData();
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            timestamp.innerHTML = `
                Last fetched: ${new Date(lastUpdate).toLocaleString()}<br>
                Next update: ${nextUpdate.toLocaleString()}<br>
                <span style="color: #55FFFF">Time until next update: ${hours}h ${minutes}m ${seconds}s</span>
            `;
        }, 1000);
        
        timestamp.dataset.intervalId = intervalId;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const cachedItems = getFromCache();
    if (cachedItems) {
        displayItems(cachedItems);
        updateTimestamp();
    } else {
        fetchData();
    }
}); 