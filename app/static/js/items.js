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

function getTierColor(tier) {
    const colors = {
        'NORMAL': '#FFFFFF',
        'UNIQUE': '#FFFF55',
        'RARE': '#55FFFF',
        'LEGENDARY': '#5555FF',
        'MYTHIC': '#FF55FF',
        'FABLED': '#FF5555',
        'SET': '#55FF55'
    };
    
    // Handle null, undefined, or non-string tier values
    if (!tier || typeof tier !== 'string') {
        return colors.NORMAL;
    }
    
    return colors[tier.toUpperCase()] || colors.NORMAL;
}

function getCategoryDisplayName(category) {
    const displayNames = {
        // Weapons
        'wand': 'Wand',
        'bow': 'Bow',
        'dagger': 'Dagger',
        'spear': 'Spear',
        'relik': 'Relik',
        // Armor
        'helmet': 'Helmet',
        'chestplate': 'Chestplate',
        'leggings': 'Leggings',
        'boots': 'Boots',
        // Accessories
        'ring': 'Ring',
        'bracelet': 'Bracelet',
        'necklace': 'Necklace',
        // Other
        'weapon': 'Weapon',
        'armour': 'Armour',
        'accessory': 'Accessory',
        'unknown weapon': 'Unknown Weapon',
        'unknown armor': 'Unknown Armor',
        'unknown accessory': 'Unknown Accessory',
        'unknown': 'Unknown'
    };
    
    return displayNames[category.toLowerCase()] || 
           category.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

function filterEfficientItems(items) {
    // Keep track of the highest XP bonus seen at each level and below
    let maxXPByLevel = [];
    return items.filter(item => {
        const level = item.level;
        const xpBonus = item.xpBonus;
        const maxPossibleXP = xpBonus.max || xpBonus.raw || 0;
        
        // If we've seen a lower or equal level item that always gives more XP, skip this item
        for (let i = 0; i <= level; i++) {
            if (maxXPByLevel[i] && maxXPByLevel[i] > maxPossibleXP) {
                return false;
            }
        }
        
        // Update the maximum XP bonus for this level
        // We use the minimum XP bonus here because we want to be conservative
        // Only update if this item is guaranteed to give more XP than what we've seen
        const guaranteedXP = xpBonus.min || xpBonus.raw || 0;
        if (!maxXPByLevel[level] || guaranteedXP > maxXPByLevel[level]) {
            maxXPByLevel[level] = guaranteedXP;
        }
        return true;
    });
}

function getCategoryOrder(category) {
    const orderMap = {
        // Armor pieces (1-10)
        'helmet': 1,
        'chestplate': 2,
        'leggings': 3,
        'boots': 4,
        // Accessories (11-20)
        'ring': 11,
        'necklace': 12,
        'bracelet': 13,
        // Weapons (21-30)
        'bow': 21,
        'dagger': 22,
        'relik': 23,
        'spear': 24,
        'wand': 25,
        // Other categories (31+)
        'ingredient': 31,
        'unknown': 100
    };
    
    return orderMap[category.toLowerCase()] || 50;
}

function updateUI(categories) {
    const itemsContainer = document.getElementById('items');
    itemsContainer.innerHTML = '';

    // Sort categories by our custom order
    Object.entries(categories)
        .sort(([a], [b]) => {
            const orderA = getCategoryOrder(a);
            const orderB = getCategoryOrder(b);
            if (orderA === orderB) {
                // If in the same order group, sort alphabetically
                return a.localeCompare(b);
            }
            return orderA - orderB;
        })
        .forEach(([category, items]) => {
            const categoryId = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';
            categoryDiv.id = `category-${categoryId}`;
            
            categoryDiv.innerHTML = `
                <h2 onclick="toggleCategory('${categoryId}')">${getCategoryDisplayName(category)} (${items.length} items)</h2>
                <div class="items-grid" id="items-${categoryId}">
                    ${items.map(item => {
                        const itemId = `${categoryId}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                        return `
                        <div class="item" id="${itemId}" onclick="toggleItem('${itemId}')">
                            <span>
                                <span style="color: ${getTierColor(item.tier)}">${item.name}</span> : ${item.tier}
                            </span>
                            <div class="item-info">
                                <span class="level">Level ${item.level}</span>, 
                                <span class="xp-bonus">XP Bonus: ${
                                    item.xpBonus.min === item.xpBonus.max 
                                        ? `${item.xpBonus.min}%`
                                        : `${item.xpBonus.min}-${item.xpBonus.max}%`
                                }</span>
                            </div>
                            <span class="${item.tradeable ? 'tradeable' : 'not-tradeable'}">
                                [${item.tradeable ? 'Tradeable' : 'Not Tradeable'}]
                            </span>
                            <div class="item-details">
                                ${item.requirements && Object.keys(item.requirements).length > 0 ? `
                                    <div class="stat"><strong>Requirements:</strong></div>
                                    ${Object.entries(item.requirements).map(([key, value]) => 
                                        `<div class="stat">- ${key}: ${value}</div>`
                                    ).join('')}
                                ` : ''}
                                <div class="stat"><strong>Stats:</strong></div>
                                ${Object.entries(item.stats).map(([key, value]) => {
                                    if (typeof value === 'object') {
                                        const rawValue = value.raw || 0;
                                        return `<div class="stat ${rawValue > 0 ? 'positive' : 'negative'}">
                                            - ${key}: ${value.min}-${value.max}
                                        </div>`;
                                    }
                                    return `<div class="stat ${value > 0 ? 'positive' : 'negative'}">
                                        - ${key}: ${value}
                                    </div>`;
                                }).join('')}
                                ${item.dropInfo ? `
                                    <div class="drop-info">Drop: ${item.dropInfo}</div>
                                ` : ''}
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
            
            itemsContainer.appendChild(categoryDiv);
        });
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
                fetchItems();
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

function updateSummary(categories) {
    const summaryContainer = document.querySelector('.summary-grid');
    if (!summaryContainer) return;
    
    // Clear existing summary
    summaryContainer.innerHTML = '';
    
    // Add total items summary
    const totalItems = Object.values(categories).reduce((sum, cat) => sum + cat.length, 0);
    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.innerHTML = `<strong>Total Items:</strong> ${totalItems}`;
    summaryContainer.appendChild(totalDiv);
    
    // Add category summaries in the same order as the main display
    Object.entries(categories)
        .sort(([a], [b]) => {
            const orderA = getCategoryOrder(a);
            const orderB = getCategoryOrder(b);
            if (orderA === orderB) {
                return a.localeCompare(b);
            }
            return orderA - orderB;
        })
        .forEach(([category, items]) => {
            const tradeableCount = items.filter(item => item.tradeable).length;
            const maxXP = Math.max(...items.map(item => item.xpBonus.max || 0));
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'summary-item';
            categoryDiv.innerHTML = `
                <strong>${getCategoryDisplayName(category)}</strong><br>
                Items: ${items.length}<br>
                Tradeable: ${tradeableCount}<br>
                Max XP: ${maxXP}%
            `;
            summaryContainer.appendChild(categoryDiv);
        });
}

// Update the sorting in fetchItems and cached items processing
function processItems(items) {
    const categories = {};
    
    // Process each item and sort into categories
    Object.entries(items).forEach(([itemName, item]) => {
        let category;
        if (item.type === 'weapon') {
            category = item.weaponType || 'Unknown Weapon';
        } else if (item.type === 'armour') {
            category = item.armourType || 'Unknown Armor';
        } else if (item.type === 'accessory') {
            category = item.accessoryType || 'Unknown Accessory';
        } else {
            category = item.type || 'Unknown';
        }
        
        if (!categories[category]) categories[category] = [];
        
        categories[category].push({
            name: itemName,
            tier: item.tier || 'NORMAL',
            level: item.requirements?.level || 0,
            xpBonus: typeof item.identifications.xpBonus === 'object' 
                ? item.identifications.xpBonus 
                : { min: item.identifications.xpBonus, max: item.identifications.xpBonus, raw: item.identifications.xpBonus },
            tradeable: !item.restrictions?.untradeable,
            stats: item.identifications,
            requirements: item.requirements || {},
            dropInfo: item.dropRestriction
        });
    });

    // Sort items in each category by level only
    Object.values(categories).forEach(items => {
        items.sort((a, b) => a.level - b.level);
        
        // Then filter out less efficient items
        const filteredItems = filterEfficientItems(items);
        items.length = 0;
        items.push(...filteredItems);
    });

    return categories;
}

// Update fetchItems to use processItems
async function fetchItems() {
    try {
        console.log('Fetching items...');
        const response = await fetch('/items_data.json');
        const data = await response.json();
        
        if (!data.success || !data.items) {
            console.error('Failed to fetch items:', data.error);
            document.getElementById('items').innerHTML = `<p class="error">Error: ${data.error || 'Failed to fetch items'}</p>`;
            return;
        }

        console.log('Data received:', data);
        saveToCache(data.items);

        const categories = processItems(data.items);
        updateUI(categories);
        updateTimestamp();
        updateSummary(categories);

    } catch (error) {
        console.error('Error fetching items:', error);
        document.getElementById('items').innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

// Update the cached items processing
document.addEventListener('DOMContentLoaded', () => {
    const cachedItems = getFromCache();
    if (cachedItems) {
        const categories = processItems(cachedItems);
        updateUI(categories);
        updateTimestamp();
        updateSummary(categories);
    } else {
        fetchItems();
    }
}); 