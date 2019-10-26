/**
 * @author Felix M�ller aka syl3r86
 * @version 0.4.8
 */

//let Actor5eSheet = CONFIG.Actor.sheetClass;
class BetterNPCActor5eSheet extends ActorSheet5eNPC {
            
    get template() {
        // adding the #equals and #unequals handlebars helper
        Handlebars.registerHelper('equals', function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        const path = "public/systems/dnd5e/templates/actors/";
        if (!game.user.isGM && this.actor.limited) return path + "limited-sheet.html";
        return "public/modules/betternpcsheet5e/template/npc-sheet.html";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["sheet","better-npc-sheet-container"],
            width: 600,
            height: 300
        });
        return options;
    }
    
    getData() {
        const data = super.getData();
        // setting to display either the Icon of the item (true) or a generic d20 icon (false)
        this.useFeatIcons = false;
        this.useWeaponIcons = false;
        this.useSpellIcons = false;

        data['useFeatIcons'] = this.useFeatIcons;
        data['useWeaponIcons'] = this.useWeaponIcons;
        data['useSpellIcons'] = this.useSpellIcons;
        return data;
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        
        // only do stuff if its for npcs
        if (this.actor.data.type === "character") {
            return;
        }

        // rebind roll function
        html.find('.item .rollable').click(event => this._onItemRoll(event));


        // register settings
        game.settings.register("BetterNPCSheet", this.object.data._id, {
            name: "Settings specific to NPC display",
            hint: "Settings to exclude packs from loading",
            default: "",
            type: String,
            scope: 'user',
            onChange: settings => {
                this.settings = JSON.parse(settings);
            }
        });
        // load settings from container
        let settings = game.settings.get("BetterNPCSheet", this.object.data._id);
        if (settings == '') { // if settings are empty create the settings data
            console.log("NPC Settings | Creating settings");
            settings = {};
            for (let item of this.object.data.items) {
                if (item.type == 'spell') {
                    let target = `.item[data-item-id=${item.id}] .item-description`;
                    settings[target] = false;
                }
            }
            settings.editMode = false;
            game.settings.set('BetterNPCSheet', this.object.data._id, JSON.stringify(settings));
        } else {
            settings = JSON.parse(settings);
        }
        // apply them
        console.log("NPC Settings | Loading settings");
        for (let key in settings) {
            let target = html.find(key);
            if (settings[key] == true) {
                target.show();
            } else {
                target.hide();
            }
        }
        this.settings = settings;



        // hide elements that are part of the edit mode or empty
        this._applySettingsMode(this.settings.editMode, html);

        // toggle edit mode button event
        html.find('.editBtn').click(e => {
            this.settings.editMode = !this.settings.editMode;
            game.settings.set('BetterNPCSheet', this.object.data._id, JSON.stringify(this.settings));
            this._applySettingsMode(this.settings.editMode, html);
        });

        // set dynamic input width
        let inputs = html.find('.npc-textinput,.npc-textinput-small');
        inputs.keyup(e => {
            if (e.target.value != '') {
                e.target.style.width = e.target.value.length + 1 + 'ch';
            } else {
                e.target.style.width = e.target.placeholder.length + 'ch';
            }
        });
        inputs.change(e => {
            if (e.target.value != '') {
                e.target.style.width = e.target.value.length + 1 + 'ch';
            } else {
                e.target.style.width = e.target.placeholder.length + 'ch';
            }
        });
        inputs.trigger('change');

        // adding toggle for item detail
        html.find('.npc-item-name').click(event => this._onItemSummary(event));


        html.find('.body-tile-name').click(e => {
            let target = e.target.getAttribute('data-tile');
            let collapsTarget = e.target.getAttribute('data-target') || 'item';
            let targetTile = `.body-tile[data-tile=${target}] .${collapsTarget}`;
            if (this.settings[targetTile] === undefined || this.settings[targetTile] === true) {
                html.find(targetTile).hide(100);
                this.settings[targetTile] = false;
            } else {
                html.find(targetTile).show(100);
                this.settings[targetTile] = true;
            }
            game.settings.set('BetterNPCSheet', this.object.data._id, JSON.stringify(this.settings));
        });

        // remove window padding
        $('.better-npc-sheet').parent().css('padding', '0');

        // setting npcsheet width & height 
        setTimeout(() => {
            let style = html.parent().parent().attr('style');
            console.log(style);

            // change width
            let columnCount = 2;
            if (this.object.data.items.length > 10) {
                columnCount = 3;
            }
            let newWdith = columnCount * 300;
            style = style.replace('width: 600px;', `width: ${newWdith}px;`);
            this.position.width = newWdith;

            //change height
            let newHeight = $(html).outerHeight(true) + $(html.parent().parent().find('.window-header')).outerHeight(true);
            style = style.replace('height: 300px;', `height: ${newHeight}px;`);
            this.position.height = newHeight;

            $(html.parent().parent()).attr('style', style);
        }, 10);

        
        // spellslot control buttons
        html.find('.spellslot-mod').click(ev => {
            let mod = event.target.getAttribute("data-mod");
            let level = event.target.getAttribute("data-level");
            let slotElement = $(html.find(`input[name="data.spells.spell${level}.value"]`));
            let newValue = mod == '+' ? Number(slotElement.val()) + 1 : Number(slotElement.val()) - 1;
            slotElement.val(newValue >= 0 ? newValue : 0);
            slotElement.trigger('submit');
        });

        // list changing logic:
        html.find('.item-change-list').click(ev => {
            let target = $(ev.target).parents('.item').find('.type-list');
            target.toggle(200);
        });
        html.find('.npc-item-name').contextmenu(ev => {
            let target = $(ev.target).parents('.item').find('.type-list');
            target.toggle(200);
        });

        html.find('.type-list a').click(ev => {
            let targetList = ev.target.dataset.value
            let itemId = Number($(ev.target).parents('.item').attr('data-item-id'));
            let item = this.actor.items.find(i => { return i.id === itemId });
            if (!item.flags) item.flags = {};
            if (!item.flags.adnd5e) item.flags.adnd5e = {};
            if (!item.flags.adnd5e.itemInfo) item.flags.adnd5e.itemInfo = {};
            item.flags.adnd5e.itemInfo.type = targetList;
            this.actor.updateOwnedItem(item, true);
        });

        // item creation
    }

    _applySettingsMode(editMode, html) {
        let hidable = html.find('.hidable');
        for (let obj of hidable) {
            let data = obj.getAttribute('data-hidable-attr');
            if (data == '' || data == 0) {
                if (editMode == false) {
                    obj.style.display = 'none';
                } else {
                    obj.style.display = '';
                }
            }
            //let hidableAttr = obj.getElementsByClassName('.hidable-attr');
        }
        if (editMode) {
            html.find('.show-on-edit').show();
            html.find('.hide-on-edit').hide();
            html.find('input').css('background', 'white');
            html.find('.saves-div').show();
            html.find('.skills-div').show();
        } else {
            html.find('.show-on-edit:not(.hidable)').hide();
            html.find('.hide-on-edit').show();
            html.find('input').css('background', 'none');
            if (html.find('.saves-div .hidable[data-hidable-attr="1"]').length == 0) {
                html.find('.saves-div').hide();
            }
            if (html.find('.skills-div .hidable[data-hidable-attr="1"], .skills-div .hidable[data-hidable-attr="0.5"], .skills-div .hidable[data-hidable-attr="2"]').length == 0) {
                html.find('.skills-div').hide();
            }
        }
    }
    
    /**
    * Organize and classify Items for NPC sheets
    * @private
    */
    _prepareItems(actorData) {

        // Features
        const features = [];

        // Weapons
        const weapons = [];

        const legendarys = [];
        const reactions = [];
        const lair = [];

        // Spellbook
        const spellbook = {};

        // Iterate through items, allocating to containers
        for (let i of actorData.items) {
            i.img = i.img || DEFAULT_TOKEN;
            // Spells
            if (i.type === "spell") {
                let lvl = i.data.level.value || 0;
                spellbook[lvl] = spellbook[lvl] || {
                    isCantrip: lvl === 0,
                    label: CONFIG.spellLevels[lvl],
                    spells: [],
                    uses: actorData.data.spells["spell" + lvl].value || 0,
                    slots: actorData.data.spells["spell" + lvl].max || 0
                };
                i.data.school.str = CONFIG.spellSchools[i.data.school.value];
                spellbook[lvl].spells.push(i);
            }

            // Features
            if (i.type !== "spell" && i.flags && i.flags.adnd5e && i.flags.adnd5e.itemInfo && i.flags.adnd5e.itemInfo.type) {
                switch (i.flags.adnd5e.itemInfo.type) {
                    case 'trait': features.push(i); break;
                    case 'action': weapons.push(i); break;
                    case 'legendary': legendarys.push(i); break;
                    case 'reaction': reactions.push(i); break;
                    case 'lair': lair.push(i); break;
                    default: {
                        if (i.type === "weapon") weapons.push(i);
                        else if (i.type === "feat") features.push(i);
                        else if (["equipment", "consumable", "tool", "backpack"].includes(i.type)) features.push(i);
                    }
                }
            } else {
                if (i.type === "weapon") weapons.push(i);
                else if (i.type === "feat") features.push(i);
                else if (["equipment", "consumable", "tool", "backpack"].includes(i.type)) features.push(i);
            }
        }

        // Assign the items
        actorData.actor.features = features;
        actorData.actor.spellbook = spellbook;
        actorData.actor.weapons = weapons;
        actorData.actor.legendarys = legendarys;
        actorData.actor.reactions = reactions;
        actorData.actor.lair = lair;
    }


    _onItemCreate(event) {
        event.preventDefault();

        let itemType = $(event.target).parents('.body-tile').attr('data-tile');
        let header = event.currentTarget;
        let data = duplicate(header.dataset);
        data.flags = {
            'adnd5e': {
                'itemInfo': {
                    'type': itemType
                }
            }
        }
        data["name"] = `New ${itemType.capitalize()}`;
        if (itemType === 'legendary' || itemType === 'lair') {
            data["name"] += ' Action';
        }

        this.actor.createOwnedItem(data, true, { renderSheet: true });
    }

    toggleEditMoed() {
        if (this.editMode == true) {
            for (let obj of html.find('.hidable')) {
                if (obj.querySelector('.hidable-attr') != undefined &&
                    (obj.querySelector('.hidable-attr').value == '' || obj.querySelector('.hidable-attr').value == 0)) {
                    obj.style.display = "none";
                }
            }
            html.find('.show-on-edit').hide(100);
            html.find('.hide-on-edit').show(100);
            this.editMode = false;
        } else {
            for (let obj of html.find('.hidable')) {
                if (obj.querySelector('.hidable-attr') != undefined &&
                    (obj.querySelector('.hidable-attr').value == '' || obj.querySelector('.hidable-attr').value == 0)) {
                    obj.style.display = "inline-block";
                }
            }
            html.find('.show-on-edit').show(100);
            html.find('.hide-on-edit').hide(100);
            this.editMode = true;
        }
    }
}

Actors.registerSheet("dnd5e", BetterNPCActor5eSheet, {
    types: ["npc"],
    makeDefault: true
});