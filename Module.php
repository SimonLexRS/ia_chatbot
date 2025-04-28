<?php
namespace Modules\IaChatbot;

use Zabbix\Core\CModule;
use APP;
use CMenuItem;
use CController as CAction;

class Module extends CModule {
    public function init(): void {
        APP::Component()->get('menu.main')
            ->add(
                (new CMenuItem(_('Zabbix IA')))
                    ->setAction('ia_chatbot.chat')
                    ->setIcon('fa fa-comments')
            );
    }

    /**
     * Grant access to this module for all logged-in users
     */
    public function hasAccess($userType): bool {
        // Allow all authenticated users
        return true;
    }
    
    /**
     * Define acciones disponibles para el módulo
     */
    public function getActions(): array {
        return [
            // Acción para mostrar el chat
            'chat' => [
                'class' => 'Modules\IaChatbot\Actions\ChatAction',
                'view' => 'chat'
            ],
            // Acción para procesar mensajes
            'chat_message' => [
                'class' => 'Modules\IaChatbot\Actions\ChatMessageAction',
                'layout' => 'layout.json'
            ]
        ];
    }
}