using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace VLCBlazor
{
    public partial class VlcPlayer : ComponentBase
    {
        [Inject]
        protected IJSRuntime JSRuntime { get; set; }    

        private VlcJsInterop? module;

        private ElementReference playerRef;

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                module = new VlcJsInterop(JSRuntime);
                await module.InitAsync(playerRef);
            }
            await base.OnAfterRenderAsync(firstRender);
        }
    }
}
