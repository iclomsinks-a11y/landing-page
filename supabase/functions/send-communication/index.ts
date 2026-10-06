import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.json()
    const body = rawBody.payload || rawBody

    const recipient = body.recipient || body.to || body.destinatario_email
    const subject = body.subject || body.asunto || 'Notificación de GESTARIAN'
    const content = body.content || body.htmlBody || body.cuerpo_html || '<p>Bienvenido a GESTARIAN.</p>'
    const rawAttachments = body.attachments || body.adjuntos || []

    if (!recipient) {
      return new Response(
        JSON.stringify({ success: false, error: 'Destinatario (recipient / to) no especificado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY no configurada en Supabase Secrets.')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falta configurar RESEND_API_KEY en Supabase Secrets.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const resendAttachments = rawAttachments.map((att: any) => {
      let base64Content = att.content || ''
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1]
      }
      base64Content = base64Content.replace(/[\r\n\s]/g, '')

      const item: any = {
        filename: att.filename || att.nombre || 'documento.pdf',
        content: base64Content
      }
      if (att.contentType) {
        item.contentType = att.contentType
      }
      return item
    })

    const resendPayload = {
      from: 'GESTARIAN Notificaciones <onboarding@resend.dev>',
      to: [recipient],
      subject: subject,
      html: content,
      attachments: resendAttachments
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resendPayload)
    })

    const rawResponseText = await resendResponse.text()
    let resendData: any = {}
    try {
      resendData = JSON.parse(rawResponseText)
    } catch (e) {
      resendData = { rawText: rawResponseText }
    }

    if (!resendResponse.ok) {
      const errMessage = resendData.message || resendData.name || resendData.rawText || `HTTP ${resendResponse.status} Error en Resend`
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend API (HTTP ${resendResponse.status}): ${errMessage}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const now = new Date()
    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
        id: resendData.id,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error interno en Edge Function' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
